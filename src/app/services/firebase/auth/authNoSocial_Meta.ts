import { IAuthNoSocial, AuthNoSocial } from '../../../models/firebase/auth/authNoSocial';
import { IQValue } from '../fs_Model_Service';
import { IMetaCampo, IMetaColeccion } from '../meta_Util'

//================================================================================================================================
/*AuthKeyCtrl_Util*/

export class AuthNoSocial_Meta implements IAuthNoSocial<any>, IMetaColeccion {
    
    __nomColeccion: string;
    __nomPathColeccion: string;
    __isEmbSubcoleccion: boolean;

    _id: IMetaCampo<string, any>;
    //_pathDoc:IMetaCampo<string, any>;
    email: IMetaCampo<string, any>;
    pass: IMetaCampo<string, any>;
    provider: IMetaCampo<string, any>;

    constructor() {
        //metadata nivel coleccion
        this.__nomColeccion = "AuthNoSocial";
        this.__nomPathColeccion = ""; 
        this.__isEmbSubcoleccion = false;       
        
        //metadata nivel campo
        this._id = {
            nom:"_id",
            default:"",
            isRequerido:true
        };
        // this._pathDoc = {
        //     nom:"_pathDoc",
        //     isRequerido:true
        // };
        this.email = {
            nom:"email",
            default:"",
            isRequerido:true
        };
        this.pass = {
            nom:"pass",
            default:"",
            isRequerido:true
        }
        this.provider = {
            nom:"provider",
            default:"",
            isRequerido:true,
        }
        //================================================================


    }

}

//================================================================================================================================
