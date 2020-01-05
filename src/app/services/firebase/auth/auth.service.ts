import { Injectable } from '@angular/core';

import { AngularFireAuth } from '@angular/fire/auth';
import { auth } from 'firebase/app';

import { Observable, Subscription } from 'rxjs';
import { map, switchMap, } from 'rxjs/operators';

import { AuthNoSocialCtrl_Util, ETipoAuth } from './authNoSocialCtrl_Util';
import { AuthNoSocial } from 'src/app/models/firebase/auth/authNoSocial';


@Injectable()
export class AuthService {

    public Model_Util:AuthNoSocialCtrl_Util;
    
    private authInfoUser:firebase.User | null;
    public authUserId:string | null;

    private obsAuth:Observable<firebase.User>;
    private suscripAuth:Subscription;

    constructor(private afAuth: AngularFireAuth
                ) {

        this.Model_Util = new AuthNoSocialCtrl_Util();

        this.authInfoUser = null;
        this.authUserId = null;

        this.obsAuth = null;
        this.suscripAuth = null;
        this.monitorearAuth();
    }

    private monitorearAuth(){
        this.obsAuth = this.afAuth.authState;
        this.suscripAuth = this.obsAuth.subscribe({
            next:(info)=>{
                this.authInfoUser = info;
                this.authUserId = (info && info != null) ?
                            info.uid :
                            null;
            },
            error:(err)=>{
                console.log(err);
            } 
        });
    }

    public signUpNoSocial(authCredential:AuthNoSocial):Promise<auth.UserCredential> {
        return this.afAuth.auth.createUserWithEmailAndPassword(authCredential.email, authCredential.pass);
    }    

    public login(tipoAuth:ETipoAuth, authCredential?:AuthNoSocial):Promise<auth.UserCredential> {

        switch (tipoAuth) {

            case ETipoAuth.email:
                    return (authCredential && authCredential.email && authCredential.pass) ?
                            this.afAuth.auth.signInWithEmailAndPassword(authCredential.email, authCredential.pass) :
                            null;
                break;

            case ETipoAuth.google:
                    const provider = new auth.GoogleAuthProvider();
                    return this.afAuth.auth.signInWithPopup(provider);
                break;
            default:
                return null;
                break;
        }

    }

    public logout():Promise<void> {
        return this.afAuth.auth.signOut();
    }

    get AuthInfoUser(){
        return this.authInfoUser;
    }

    // emailSignup(email: string, password: string) {
    //     this.afAuth.auth.createUserWithEmailAndPassword(email, password)
    //         .then(value => {
    //             console.log('Sucess', value);
    //             this.router.navigateByUrl('/profile');
    //         })
    //         .catch(error => {
    //             console.log('Something went wrong: ', error);
    //         });
    // }

    // googleLogin() {
    //     const provider = new auth.GoogleAuthProvider();
    //     return this.afAuth.auth.signInWithPopup(provider)
    //         .then(value => {
    //             console.log('Sucess', value),
    //                 this.router.navigateByUrl('/profile');
    //         })
    //         .catch(error => {
    //             console.log('Something went wrong: ', error);
    //         });
    // }

}