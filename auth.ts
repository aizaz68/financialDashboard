import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import Credentials from 'next-auth/providers/credentials';
import {z} from 'zod';
import type { User } from "./app/lib/definitions";
import bcrypt from 'bcrypt';
import { sql } from "@vercel/postgres";


async function getUser(email:string):Promise<User|undefined>{
    try {
        const user=await sql<User>`Select * from users where email=${email}`;
        return user.rows[0];
    }
  
    catch (error) {
        throw new Error('Failed to Fetch User'+error);
    }
}



export const {auth,signIn,signOut}=NextAuth({...authConfig,providers:[Credentials({
    async authorize(credentials){
        const parsedCredentils =z.object({email:z.string().email(),password:z.string().min({6)}).safeParse(credentials);
        if(parsedCredentils.success){
            const {email,password}=parsedCredentils.data;
            const user=await getUser(email);    
            if(!user){return null;}
            const passwordMatch=await bcrypt.compare(password,user.password);
            if(passwordMatch){return user;}
        }
        return null;
    },
})]});