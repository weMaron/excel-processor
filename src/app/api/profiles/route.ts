import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

export const dynamic = 'force-dynamic';
import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc as firestoreDoc,
    setDoc,
    query,
    orderBy,
    serverTimestamp,
} from 'firebase/firestore';

export async function GET(req: NextRequest) {
    if (!db) {
        return NextResponse.json({
            error: 'Firebase not initialized',
            details: 'Database connection is null. Check environment variables (FIREBASE_WEBAPP_CONFIG).'
        }, { status: 500 });
    }
    try {
        const q = query(collection(db, 'unifiedProfiles'), orderBy('updatedAt', 'desc'));

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Firestore timeout')), 15000)
        );

        const querySnapshot = await Promise.race([
            getDocs(q),
            timeoutPromise
        ]) as { docs: any[] };

        const data = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Fetch error details:', {
            message: error.message,
            stack: error.stack,
            env: {
                hasConfig: !!process.env.FIREBASE_WEBAPP_CONFIG,
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'missing'
            }
        });
        return NextResponse.json({
            error: 'Failed to fetch profiles',
            details: error.message,
            code: error.code
        }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    if (!db) {
        return NextResponse.json({
            error: 'Firebase not initialized',
            details: 'Database connection is null.'
        }, { status: 500 });
    }
    let action, id;
    try {
        const body = await req.json();
        action = body.action;
        id = body.id;
        const { name, data } = body;

        if (!action) return NextResponse.json({ error: 'Missing action' }, { status: 400 });

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Firestore timeout')), 5000)
        );

        if (action === 'save') {
            const docData = {
                ...data,
                name: name || data.name,
                updatedAt: serverTimestamp()
            };

            if (id) {
                // Update existing
                await Promise.race([
                    setDoc(firestoreDoc(db, 'unifiedProfiles', id), docData, { merge: true }),
                    timeoutPromise
                ]);
                return NextResponse.json({ id });
            } else {
                // Create new
                const docRef = await Promise.race([
                    addDoc(collection(db, 'unifiedProfiles'), docData),
                    timeoutPromise
                ]) as { id: string };
                return NextResponse.json({ id: docRef.id });
            }
        }


        if (action === 'delete') {
            if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
            await Promise.race([
                deleteDoc(firestoreDoc(db, 'unifiedProfiles', id)),
                timeoutPromise
            ]);
            return NextResponse.json({ status: 'ok' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        console.error('Post error details:', {
            message: error.message,
            action,
            id
        });
        return NextResponse.json({
            error: 'Operation failed',
            details: error.message,
            code: error.code
        }, { status: 500 });
    }
}
