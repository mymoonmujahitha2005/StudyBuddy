import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { ProcessedStudyMaterial } from './geminiService';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const saveMaterial = async (userId: string, fileName: string, fileType: string, result: ProcessedStudyMaterial, originalUrl?: string) => {
  const path = 'materials';
  try {
    if (!auth.currentUser) {
       throw new Error("Authentication required to save material.");
    }
    
    const docRef = await addDoc(collection(db, path), {
      userId: auth.currentUser.uid, // Use current auth UID directly to ensure consistency
      fileName,
      fileType,
      originalUrl: originalUrl || null,
      status: 'completed',
      createdAt: serverTimestamp(),
      ...result
    });
    return docRef.id;
  } catch (error: any) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const getUserMaterials = async (userId: string) => {
  const path = 'materials';
  try {
    const q = query(
      collection(db, path),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

export const getMaterialById = async (id: string) => {
  const path = `materials/${id}`;
  try {
    const docSnap = await getDoc(doc(db, 'materials', id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
};

export const deleteMaterial = async (id: string) => {
  const path = `materials/${id}`;
  console.log("Firestore: Deleting document at path:", path);
  try {
    await deleteDoc(doc(db, 'materials', id));
    console.log("Firestore: Successfully deleted document:", id);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};
