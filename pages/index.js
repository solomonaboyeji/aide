import Head from "next/head";
import Link from "next/link";
import { useUser } from "@auth0/nextjs-auth0/client"
import { getSession } from "@auth0/nextjs-auth0";

export default function Home() {

  const { isLoading, error, user } = useUser();

  if (isLoading) return <div>Loading...</div>

  if (error) return <div>{error.message}</div>

  return (
    <>
      <Head>
        <title>Chatty Pete - Login or Signup</title>
      </Head>
      <div className="flex justify-center items-center min-h-screen w-full bg-gray-800 text-white text-center">
        <div >
          {!!user && <Link href={"/api/auth/logout"} >Logout</Link>}
          {!user &&
            <>
              <Link href={"/api/auth/login"} className="btn" >Login</Link>
              <Link href={"/api/auth/signup"} className="btn" >Signup</Link>
            </>
          }
        </div>
      </div>
    </>
  );
}

// Redirect the logged in user to the dashboard, i.e. the ChatUI Page
export const getServerSideProps = async (context) => {
  const session = await getSession(context.req, context.res);
  if (!!session) {
    return {
      redirect: {
        "destination": "/chat"
      }
    }
  }

  return {
    props: {},
  }
}
