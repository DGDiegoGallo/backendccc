import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseAuthService {
  constructor() {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    }
  }

  /**
   * Crea un usuario en Firebase Authentication.
   */
  async createUser(data: { email: string; password: string; displayName: string }) {
    return await admin.auth().createUser({
      email: data.email,
      password: data.password,
      displayName: data.displayName,
    });
  }

  /**
   * Obtiene los detalles de un usuario en Firebase por su UID.
   */
  async getUserByUid(uid: string) {
    return await admin.auth().getUser(uid);
  }

  /**
   * Obtiene un usuario por su email.
   */
  async getUserByEmail(email: string) {
    return await admin.auth().getUserByEmail(email);
  }

  /**
   * Elimina un usuario de Firebase por su UID.
   */
  async deleteUser(uid: string) {
    return await admin.auth().deleteUser(uid);
  }
}
