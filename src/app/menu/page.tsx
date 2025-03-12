"use client";
import { useAuth } from "../AuthContext"
import { signOut } from "firebase/auth"
import { auth } from "../firebase";

export default function Menu(){
    const {user} = useAuth();

    const logout = async()=>{
        await signOut(auth);
    }
    return(
        <>
        {
         user ? 
         (<><h1>Welcome to main menu</h1> <button onClick={logout}>Logout</button></>)
         :( <p> you are logged out</p>)

        }
        </>
    )
}