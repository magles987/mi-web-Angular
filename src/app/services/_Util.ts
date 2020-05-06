import { v4 } from "uuid";
//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
/*abstract class _Util*/
//
export abstract class _Util {

    constructor() {}

    //================================================================
    /*copiarData()*/
    //clonacion de objetos JSON a  diferentes niveles de profundidad
    //CUIDADO CON EL STACK, NO PUEDE SER MUY PROFUNDO
    //Parametros:
    //data recibe un objeto de tipo  T (que se debe tipar al llamar 
    //a este metodo) el cual puede ser objeto o array
    public clonarObj<T>(Obj:T):T{

        let dataCopia:any;

        if (typeof(Obj) == "object" || Array.isArray(Obj)) {
            if (Array.isArray(Obj)) {
                dataCopia = [];
                for (let i = 0; i < Obj.length; i++) {
                    dataCopia[i] = this.clonarObj(Obj[i]);
                }
            }else{
                dataCopia = {};
                for (const key in Obj) {
                    if (typeof(Obj[key]) == "object" || Array.isArray(Obj[key])) {
                        dataCopia[key] = this.clonarObj(Obj[key]);
                    }else{
                        dataCopia[key] = Obj[key];
                    }
                }
            }
        } else {
            dataCopia = Obj;
        }
        return dataCopia as T;
    }

    //================================================================
    /*ajustarDecimale()*/
    //redondea un numero y ajusta decimales, tomado del sitio oficial:
    //https://developer.mozilla.org/es/docs/Web/JavaScript/Referencia/Objetos_globales/Math/round
    //Parametros:
    //type-> "round" redondeo estandar (arriba si es >=5 y abajo si es <5)
    //       "floor" redondeo abajo
    //       "ceil" redondeo arriba
    //
    //numValue-> numero a redondear
    //exp -> decenas o decimales a redondear,
    //       para las decenas (decenas exp=1, centena exp=2, miles exp=3...) se usan numeros positivos
    //       para las decimales (decimas exp=-1, centecimas exp=-2, milesimas exp=-3...) se usan numeros negativos
    //       si exp es 0 ejecuta la operacion de redondeo por default de la libreria Math
    public ajustarDecimales(type:"round" | "floor" | "ceil", numValue:any, exp:number):number{

        //determinar si  exp no esta definido para que
        //no haga ninguna operacion
        if(typeof exp === 'undefined' || exp==null){
            return numValue;
        }

        // Si el exp es cero...
        if (+exp === 0) {
        return Math[type](numValue);
        }
        numValue = +numValue; //+numValue intentar convertir a numero cualquier cosa
        exp = +exp; //+exp intentar convertir a numero culaquier cosa

        // Si el valor no es un número o el exp no es un entero...
        if (isNaN(numValue) || !(typeof exp === 'number' && exp % 1 === 0)) {
        return NaN;
        }
        // Shift
        numValue = numValue.toString().split('e');
        numValue = Math[type](+(numValue[0] + 'e' + (numValue[1] ? (+numValue[1] - exp) : -exp)));
        // Shift back
        numValue = numValue.toString().split('e');
        numValue = +(numValue[0] + 'e' + (numValue[1] ? (+numValue[1] + exp) : exp));
        return numValue;
    }  

    //================================================================
    /*createKeyString()*/
    //permite crear keys individuales con sufijos aleatorios,
    //se tiene la opcion de usar un prefijo como base y seleccionar
    // la cantidad de caracteres que se desean de forma aleatoria,
    //
    //Parametros:
    //
    //prefix: prefijo para la key
    //
    //size: cantidad de caracteres aleatorio
    public createKeyString(prefix:string="", charSize:number=8):string{
        //maximo 24 y se usa logica negativa
        charSize = (charSize <= 24 && charSize > 0) ? -charSize : -24;

        let key = v4();
        key = key.replace(/-/g, ""); //quitar guiones
        key = key.slice(charSize); //quita los caracteres que esten antes de charSize (recordar que charSize es negativo)

        key = `${prefix}-${key}`;

        return key;
    }

    //================================================================
    /*isObjNotEmpty()*/
    //determina si un objeto esta construido y vacio
    //Parametros:
    //
    public isObjNotEmpty(Obj:any):boolean{
        if (!Obj || Obj == null) {
            return false;
        }
        //si tiene keys es porque No esta vacio
        return Object.keys(Obj).length > 0; 
    }
}
//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████