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
    uid: string | null;

    Usuario: Usuario;

}
//================================================================================================================================

@Injectable()
export class AuthService {

    public Model_Meta: AuthNoSocial_Meta;

    public Auth$: IAuthControl$;

    //contenedor de objetos control$ de services externos
    //a este service 
    private Controls_ext$: IControl$<unknown, unknown>[] = [];
    private pathControls_ext$: IpathControl$<unknown>[] = [];

    private Usuario$: IControl$<Usuario, IUsuario<IQValue_Usuario>>;

    constructor(
        private afAuth: AngularFireAuth,
        private _UsuarioService: UsuarioService
    ) {

        this.Model_Meta = new AuthNoSocial_Meta();

        this.Auth$ = {
            observable: null,
            suscription: null,
            authInfo: null,
            uid: null,
            Usuario: this._UsuarioService.createModel()
        }

        //crear observable de autenticacion y suscribirse
        this.Auth$.observable = this.afAuth.authState;
        this.Auth$.suscription = this.Auth$.observable.subscribe(this.RFS_Auth);
    }

    private RFS_Auth:IRunFunSuscribe<firebase.User> = {
        next:(info)=>{

            //se asume que solo existe un usuario autenticado:            
            this.Auth$.authInfo = (Array.isArray(info)) ? info[0] : info;
            this.Auth$.uid = (info && info != null) ? this.Auth$.authInfo.uid : null;

            if (this.Auth$.uid != null) {
                
                this._UsuarioService.ready()
                .then(()=>{

                    if (!this.Usuario$ || this.Usuario$ == null) {
                        const rfs_usuario = <IRunFunSuscribe<Usuario>>{
                            next: (usuario) => {
                                if (Array.isArray(usuario) && usuario.length > 0) {
                                    this.Auth$.Usuario = usuario[0];
                                    this._UsuarioService.set_f_RolCodigoForUsuario$(this.Auth$.Usuario.fk_rol);
                                } else {
                                    this.Auth$.Usuario = null;
                                }
                            },
                            error: (err) => { console.log(err) }
                        };
                        this.Usuario$ = this._UsuarioService.createControl$(rfs_usuario);                
                    }
        
                    //no se puede usar pathDoc por que this.Auth$.uid solo me entrega el id y no la ruta
                    this.Usuario$ = this._UsuarioService.getId$(this.Usuario$, this.Auth$.uid, null);
                })
                .catch((err) => { console.log(err) })
            }            
        },
        error:(err) => { console.log(err) }
    };

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
