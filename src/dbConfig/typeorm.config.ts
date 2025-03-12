import {registerAs} from '@nestjs/config';
import {config as dotenvcConfig} from 'dotenv';
import {DataSource, DataSourceOptions} from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../user/entities/user.entity';
import { Role } from '../roles.enum';

//Conexion con la bas de datos//

//cargar variables de entorno
dotenvcConfig({path:'.env'});

// Función para crear el administrador por defecto
async function createDefaultAdmin(dataSource: DataSource) {
  const userRepository = dataSource.getRepository(User);
  
  // Verificar si el admin ya existe
  const existingAdmin = await userRepository.findOne({
    where: { email: 'admin@mail.com' }
  });

  if (!existingAdmin) {
    // Crear el hash de la contraseña
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash('admin', salt);

    // Crear el usuario admin
    const adminUser = userRepository.create({
      name: 'Administrator',
      email: 'admin@mail.com',
      password: hashedPassword,
      role: Role.Admin,
      phone: '0000000000',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await userRepository.save(adminUser);
    console.log('Usuario administrador creado con éxito');
  }
}

//configuracion TypeORM//
const config: DataSourceOptions = {
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number.parseInt(process.env.DB_PORT || '5432', 10), 
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '', 
    database: process.env.DB_NAME,
    entities: [
      `${__dirname}/../**/*.entity{.ts,.js}`,
    ],
    migrations: ['dist/migrations/*{.ts,.js}'],
    synchronize: true,
    dropSchema: false,
    logging: true
};

export default registerAs('typeorm',() => config);
export const connectionSource = new DataSource(config);

// Función para limpiar tipos existentes
async function cleanupTypes(dataSource: DataSource) {
  try {
    // Primero desconectamos las dependencias y limpiamos todo
    await dataSource.query(`
      DO $$ 
      DECLARE
        r RECORD;
      BEGIN
        -- Desactivar temporalmente las restricciones
        SET CONSTRAINTS ALL DEFERRED;
        
        -- Eliminar todas las tablas relacionadas
        DROP TABLE IF EXISTS "shopify_orders" CASCADE;
        DROP TABLE IF EXISTS "shop_order" CASCADE;
        
        -- Eliminar tipos y enums
        FOR r IN (SELECT typname FROM pg_type WHERE typname IN ('shopify_orders', 'shop_order')) LOOP
          EXECUTE 'DROP TYPE IF EXISTS ' || quote_ident(r.typname) || ' CASCADE';
        END LOOP;
        
        -- Limpiar tipos huérfanos directamente
        DELETE FROM pg_type WHERE typname IN ('shopify_orders', 'shop_order');
        
        -- Restablecer restricciones
        SET CONSTRAINTS ALL IMMEDIATE;
      EXCEPTION WHEN OTHERS THEN
        -- Ignorar errores y continuar
        NULL;
      END $$;
    `);
  } catch (error) {
    console.log('Advertencia durante la limpieza:', error.message);
  }
}

// Crear una conexión temporal para limpiar antes de inicializar
const tempConfig = {...config, synchronize: false, dropSchema: false};
const tempDataSource = new DataSource(tempConfig);

// Primero limpiamos y luego inicializamos
tempDataSource
  .initialize()
  .then(async (dataSource) => {
    await cleanupTypes(dataSource);
    await dataSource.destroy(); // Cerramos la conexión temporal
    
    // Ahora iniciamos la conexión real
    connectionSource
      .initialize()
      .then(async (dataSource) => {
        console.log('Base de datos inicializada');
        await createDefaultAdmin(dataSource);
      })
      .catch((error) => console.log('Error al inicializar la base de datos:', error));
  })
  .catch((error) => console.log('Error en la limpieza inicial:', error));