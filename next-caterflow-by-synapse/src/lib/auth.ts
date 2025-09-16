import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { groq } from 'next-sanity';
import { client } from '@/lib/sanity';
import { compare } from 'bcryptjs';

const userQuery = groq`*[_type == "AppUser" && email == $email][0] {
    _id,
    _rev,
    email,
    name,
    role,
    password,
    associatedSite->{_id, name}
}`;

export const authOptions: NextAuthOptions = {
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60,
    },
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials.password) {
                    console.log('Missing credentials');
                    return null;
                }

                try {
                    const user = await client.fetch(userQuery, { email: credentials.email });

                    if (!user) {
                        console.log('User not found for email:', credentials.email);
                        return null;
                    }

                    if (!user.password) {
                        console.log('User has no password set');
                        return null;
                    }

                    const isValidPassword = await compare(credentials.password, user.password);

                    if (!isValidPassword) {
                        console.log('Invalid password for user:', user.email);
                        return null;
                    }

                    console.log('Login successful for user:', user.email);

                    return {
                        id: user._id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        associatedSite: user.associatedSite || null,
                    };
                } catch (error) {
                    console.error('Authorization error:', error);
                    return null;
                }
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.associatedSite = user.associatedSite;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
                session.user.associatedSite = token.associatedSite as any;
            }
            return session;
        },
    },
    pages: {
        signIn: '/login',
    },
    debug: process.env.NODE_ENV === 'development',
};