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
    try {
        const q = query(collection(db, 'unifiedProfiles'), orderBy('updatedAt', 'desc'));

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Firestore timeout')), 5000)
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
    } catch (error) {
        console.error('Fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, name, data, id } = body;

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
    } catch (error) {
        console.error('Post error:', error);
        return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
    }
}
