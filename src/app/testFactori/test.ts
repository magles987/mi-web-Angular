//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
/*persona:*/
//
interface persona {
    datoP:string;
}

//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████

class personaVIP implements persona{
    datoP: string;

    
    constructor() {}

}
//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
class  personaRegular implements persona{
    datoP: string;

    constructor() {}

}
//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
/*fabrica:*/
//
abstract class fabricaPersona {
    public abstract v_preMod:unknown;
    public abstract metodoFabrica(): persona;
    public superpoder:number = 0;
}

class fabricaPersonaVIP extends fabricaPersona {
    public v_preMod: string;
    public metodoFabrica(): persona {
        return new personaVIP();
    }

}

class fabricaPersonaRegular extends fabricaPersona {
    public v_preMod: number;
    public metodoFabrica(): persona {
        return new personaRegular();
    }

}
//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
/*class testConsumidorFabrica*/
//
export class testConsumidorFabrica {

    constructor() {
        let fabricaVIP = new fabricaPersonaVIP();
        fabricaVIP.superpoder
        let pVIP:personaVIP = fabricaVIP.metodoFabrica();        
    }
}
//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████

//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
/*IclienteServce:*/
//
export interface IclienteServce {
    get$(h$:any, QV:IVQ_cliente ):string
}
export interface IVQ_cliente {
    order:number;
    limit:number;
    Q_persona:{nombre:string, apellido:string}
}

export interface IVQ_clienteFS extends IVQ_cliente{
    path:string
}


export class  clienteService implements IclienteServce{
    get$(h$: any, QV:IVQ_clienteFS): string {
        QV.path="";
        return "";
    }

    constructor() {}

}


//================================================================================================================================
