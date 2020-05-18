import { Injectable } from '@angular/core';

import { AngularFireAuth } from '@angular/fire/auth';
import { auth } from 'firebase/app';

import { Observable, Subscription } from 'rxjs';
import { map, switchMap, } from 'rxjs/operators';

import { AuthNoSocial_Meta } from './authNoSocial_Meta';
import { AuthNoSocial } from 'src/app/models/firebase/auth/authNoSocial';

import { Usuario, IUsuario } from 'src/app/models/firebase/usuario/usuario';
import { UsuarioService } from '../usuario/usuario.service';
import { Rol, IRol } from 'src/app/models/firebase/rol/rol';
import { RolService } from '../rol/rol.service';

import { ServiceHandler$, IRunFunSuscribe } from '../../ServiceHandler$';
import { Fs_ModelService } from '../fs_Model_Service';


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

    public Model_Meta: AuthNoSocial_Meta;

    public Auth$: ServiceHandler$<firebase.User>;

    private keyUsuarioActual$: string;
    private keyPathRolActual$: string;

    public CurrentUsuario:Usuario | null;
    public CurrentRol:Rol | null;

    private authInfo : firebase.User | null;
    public uid :string | null;

    constructor(
        private afAuth: AngularFireAuth,
        private _UsuarioService: UsuarioService,
        private _RolService: RolService
    ) {

        this.Model_Meta = new AuthNoSocial_Meta();

        this.rebootService();

    }

    //================================================================
    /*rebootService()*/
    //rearma la configuracion del servicio, en un eventual 
    //caso que se necesite reiniciar
    public rebootService():void{
        //configurar el handler$ de autentificacion
        this.Auth$ = new ServiceHandler$<firebase.User>();
        this.Auth$.setObservable(this.afAuth.authState);
        this.Auth$.addSubscribe("auth-Start", this.RFS_Auth);

        //crear los handlers$ externos:
        this.keyUsuarioActual$ = this._UsuarioService.createHandler$(this.RFS_UsuarioActual, "Handler", "Service");
        this.keyPathRolActual$ = this._RolService.createHandler$(this.RFS_RolActual, "PathHandler", "Service");

        this.CurrentUsuario = this._UsuarioService._Util.createModel();
        this.CurrentRol = this._RolService._Util.createModel();
    }

    //================================================================
    //propiedades RFS a usar
    private RFS_Auth:IRunFunSuscribe<firebase.User> = {
        next:(info)=>{

            //se asume que solo existe un usuario autenticado:            
            this.authInfo = (Array.isArray(info)) ? info[0] : info;
            this.uid = (info && info != null) ? this.authInfo.uid : null;

            if (this.uid != null) {
                this._UsuarioService.getUsuarioActualByAuthId(this.keyUsuarioActual$, this.uid, null);
            }else{
                this.CurrentUsuario = this._UsuarioService._Util.createModel();
                this.CurrentRol = this._RolService._Util.createModel();
                this._UsuarioService.updateMeta_fk_Rol();
            }            
        },
        error:(err) => { console.log(err) }
    };

    private RFS_UsuarioActual:IRunFunSuscribe<Usuario[]> = {
        next:(uActual) => {
            if (Array.isArray(uActual) && uActual.length > 0) {

                this.CurrentUsuario = uActual[0];
                this._UsuarioService.updateMeta_fk_Rol(this.CurrentUsuario.fk_rol);

                this._RolService.populate$(this.keyPathRolActual$, this.CurrentUsuario.fk_rol);         
            
            }else{
                this.CurrentUsuario = this._UsuarioService._Util.createModel();
                this.CurrentRol = this._RolService._Util.createModel();
                this._UsuarioService.updateMeta_fk_Rol();
            }
        },
        error:(error)=>{ console.log(error)}
    };

    private RFS_RolActual:IRunFunSuscribe<Rol> = {
        next:(rol:Rol) => {
            if (rol && rol != null) {
                this.CurrentRol = rol;
            } else {
                this.CurrentRol = this._RolService._Util.createModel();
            }
            
        },
        error:(error)=>{ console.log(error)}
    }
    //================================================================


    public signUpNoSocial2(authCredential: AuthNoSocial): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.afAuth.auth.createUserWithEmailAndPassword(authCredential.email, authCredential.pass)
                .then((credencial) => {
                    let usuario = this._UsuarioService._Util.createModel();
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

    //================================================================
    /*closeHanlers$()*/
    //
    public closeHanlers$():void{
        
        this.Auth$.closeAllHandlers$([this.Auth$]);

        this._UsuarioService.closeHandlersOrPathHandlers$([this.keyUsuarioActual$]);
        this._RolService.closeHandlersOrPathHandlers$([this.keyPathRolActual$]);
        return;
    }
}
