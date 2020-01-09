import { Injectable } from '@angular/core';

import { AngularFireAuth } from '@angular/fire/auth';
import { auth } from 'firebase/app';

import { Observable, Subscription } from 'rxjs';
import { map, switchMap, } from 'rxjs/operators';

import { AuthNoSocial_Meta } from './authNoSocial_Meta';
import { AuthNoSocial } from 'src/app/models/firebase/auth/authNoSocial';

//================================================================================================================================
/*INTERFACES y Enums especiales para cada services*/
export enum ETipoAuth {
    anonimo = "anonimo",
    email = "email",
    phone = "phone",
    google = "google",
} 
//================================================================================================================================

@Injectable()
export class AuthService {

    public Model_Meta:AuthNoSocial_Meta;
    
    private authInfoUser:firebase.User | null;
    public authUserId:string | null;

    private obsAuth:Observable<firebase.User>;
    private suscripAuth:Subscription;

    constructor(private afAuth: AngularFireAuth
                ) {

        this.Model_Meta = new AuthNoSocial_Meta();

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