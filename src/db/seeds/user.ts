import { db } from '@/db';
import { user } from '@/db/schema';
import { randomUUID } from 'crypto';

async function main() {
    const sampleUser = [
        {
            id: randomUUID(),
            name: 'Ashwin Bhatnagar',
            email: 'ashwin.bhatnagar10@gmail.com',
            emailVerified: true,
            image: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        }
    ];

    await db.insert(user).values(sampleUser);
    
    console.log('✅ User seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});