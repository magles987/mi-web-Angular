
//================================================================================================================================
/*IModelo  interfaz auth*/

export interface IAuthNoSocial<TExtend>{
    _id? : TExtend;  //_id personalizado creado por el modulo uuid
//    _pathDoc? : TExtend; 

    email? : TExtend
    pass? : TExtend;
    provider? :TExtend; //opcional
}

//================================================================================================================================
/*Modelo clase auth*/

export class AuthNoSocial implements IAuthNoSocial<any> {
    _id : string = ""; //se asignará dinamicamente
//    _pathDoc:string =""; //se asignará dinamicamente

    email:string = "";
    pass:string = "";
    provider?:string = "";

}

//================================================================================================================================

