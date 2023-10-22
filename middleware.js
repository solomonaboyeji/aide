import { withMiddlewareAuthRequired } from '@auth0/nextjs-auth0/edge'
export default withMiddlewareAuthRequired();

export const config = {
    matcher: [
        '/api/chat/:path*', // protect all routes in the /api/chat directory 
        '/chat/:path*'
    ]
}