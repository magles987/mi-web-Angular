import { IAuthNoSocial, AuthNoSocial } from '../../../models/firebase/auth/authNoSocial';
import { Ctrl_Util, IUtilCampo, IValQ } from '../_Util';

//================================================================================================================================
/*INTERFACES especiales para cada Modelo_util*/
export enum ETipoAuth{
    anonimo = "anonimo",
    email = "email",
    phone = "phone",
    google = "google",
} 
//================================================================================================================================
/*AuthKeyCtrl_Util*/

export class AuthNoSocialCtrl_Util implements IAuthNoSocial<any> {

    //================================================================
    //atributos con funcionalidades para cada campo:
    _id:IUtilCampo<string, any> = {
        nom:"_id",
    };
    // _pathDoc:IUtilCampo<string, any> = {
    //     nom:"_pathDoc",
    // };

    email:IUtilCampo<string, any> = {
        nom : "email",
        isRequerido:true,
        formateoCampo:(val)=>{
            if (val && val != null) {
                val = val.trim();                
            }
            return val
        },
    };

    pass:IUtilCampo<string, any> = {
        nom : "pass",
        isRequerido:true,
        formateoCampo:(val)=>{
            if (val && val != null) {
                val = val.trim();                
            }
            return val
        },
    };

    provider:IUtilCampo<string, any> = {
        nom : "provider",
        isRequerido:true,
    };

    //================================================================

    constructor() {
    }

}

//================================================================================================================================
