// seed.ts
// this is to check if the data is talking to my database in superbase  
import { prisma } from './db';


// console.log(process.env.DATABASE_URL) 
async function seed() {
    await prisma.user.create(
        {
            data: {
                email: "cray@gmail.com",
                provider: "Github",
                name: "cray"
            }
        }
    );
    console.log("Seed data inserted!");
}

seed();