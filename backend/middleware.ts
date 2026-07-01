
import type { NextFunction, Request, Response } from "express";
import { supabase } from "./client";



export async function middleware(req: Request, res: Response, next: NextFunction) {
    const token = req.headers.authorization

    const data = await supabase.auth.getUser(token);
    const userId = data.data.user?.id
    if (userId) {
        req.userId = userId;
        next();
    }
    else {
        res.status(403).json({
            message: "Incorrect input"
        })
    }


} 