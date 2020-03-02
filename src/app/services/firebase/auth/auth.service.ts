import { Injectable } from '@angular/core';

import { AngularFireAuth } from '@angular/fire/auth';
import { auth } from 'firebase/app';

import { Observable, Subscription } from 'rxjs';
import { map, switchMap, } from 'rxjs/operators';

import { AuthNoSocial_Meta } from './authNoSocial_Meta';
import { AuthNoSocial } from 'src/app/models/firebase/auth/authNoSocial';

import { Usuario, IUsuario } from 'src/app/models/firebase/usuario/usuario';
import { UsuarioService, IQValue_Usuario } from '../usuario/usuario.service';
import { Rol, IRol } from 'src/app/models/firebase/rol/rol';
import { RolService, IQValue_Rol } from '../rol/rol.service';

import { IControl$, IRunFunSuscribe, IpathControl$ } from '../fs_Model_Service';


//================================================================================================================================
/*INTERFACES y Enums especiales para cada services*/
export enum ETipoAuth {
    anonimo = "anonimo",
    email = "email",
    phone = "phone",
    google = "google",
}

export interface IAuthControl$ {
    observable: Observable<firebase.User>;
    suscription: Subscription;

    authInfo: firebase.User | null;


}
//================================================================================================================================

@Injectable()
export class AuthService {

    public Model_Meta: AuthNoSocial_Meta;

    public Auth$: IAuthControl$;

    //contenedor de objetos control$ de services externos
    //a este service 
    private Controls_ext$: IControl$<unknown>[] = [];
    private pathControls_ext$: IpathControl$<unknown>[] = [];

    private UsuarioActual$: IControl$<Usuario>;
    private pathRolActual$: IpathControl$<Rol>;

    public CurrentUsuario:Usuario | null;
    public CurrentRol:Rol | null;
    public uid:string | null;

    constructor(
        private afAuth: AngularFireAuth,
        private _UsuarioService: UsuarioService,
        private _RolService: RolService
    ) {

        this.Model_Meta = new AuthNoSocial_Meta();

        this.Auth$ = {
            observable: null,
            suscription: null,
            authInfo: null,
        }

        //crear los control$ externos:
        this.UsuarioActual$ = this._UsuarioService.createControl$(this.RFS_UsuarioActual);
        this.pathRolActual$ = this._RolService.createPathControl$(this.RFS_RolActual);

        //crear observable de autenticacion y suscribirse
        this.Auth$.observable = this.afAuth.authState;
        this.Auth$.suscription = this.Auth$.observable.subscribe(this.RFS_Auth);

        this.CurrentUsuario = this._UsuarioService.createModel();
        this.CurrentRol = this._RolService.createModel();
    }

    private RFS_Auth:IRunFunSuscribe<firebase.User> = {
        next:(info)=>{

            //se asume que solo existe un usuario autenticado:            
            this.Auth$.authInfo = (Array.isArray(info)) ? info[0] : info;
            this.uid = (info && info != null) ? this.Auth$.authInfo.uid : null;

            if (this.uid != null) {
                
                this._UsuarioService.ready()
                .then(()=>{
                    this.UsuarioActual$ = this._UsuarioService.getUsuarioActualByAuthId(this.UsuarioActual$, this.uid, null);
                })
                .catch((err) => { console.log(err) })
            }else{
                this.CurrentUsuario = this._UsuarioService.createModel();
                this.CurrentRol = this._RolService.createModel();
                this._UsuarioService.setMeta_fk_rol();
            }            
        },
        error:(err) => { console.log(err) }
    };

    private RFS_UsuarioActual:IRunFunSuscribe<Usuario> = {
        next:(uActual:Usuario[]) => {
            if (Array.isArray(uActual) && uActual.length > 0) {

                this.CurrentUsuario = uActual[0];
                this._UsuarioService.setMeta_fk_rol(this.CurrentUsuario.fk_rol);
                this._RolService.ready()
                .then(() => {
                    this.pathRolActual$ = this._RolService.populate$(this.pathRolActual$, this.CurrentUsuario.fk_rol);
                })
                .catch((error)=>{ console.log(error)});         
            }else{
                this.CurrentUsuario = this._UsuarioService.createModel();
                this.CurrentRol = this._RolService.createModel();
                this._UsuarioService.setMeta_fk_rol();
            }
        },
        error:(error)=>{ console.log(error)}
    };

    private RFS_RolActual:IRunFunSuscribe<Rol> = {
        next:(rol:Rol) => {
            this.CurrentRol = rol;
        },
        error:(error)=>{ console.log(error)}
    }

    public signUpNoSocial2(authCredential: AuthNoSocial): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.afAuth.auth.createUserWithEmailAndPassword(authCredential.email, authCredential.pass)
                .then((credencial) => {
                    let usuario = this._UsuarioService.createModel();
                    // se usa _id de fuente externa
                    usuario._id = credencial.user.uid;
                    this._UsuarioService.create(usuario)
                        .then(() => {
                            resolve();
                        })
                        .catch((errUsuario) => {
                            reject(errUsuario);
                        });
                })
                .catch((err) => {
                    reject(err);
                });

        });

    }


    public signUpNoSocial(authCredential: AuthNoSocial): Promise<auth.UserCredential> {
        return this.afAuth.auth.createUserWithEmailAndPassword(authCredential.email, authCredential.pass);
    }

    public login(tipoAuth: ETipoAuth, authCredential?: AuthNoSocial): Promise<auth.UserCredential> {

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

    public logout(): Promise<void> {
        return this.afAuth.auth.signOut();
    }
}
