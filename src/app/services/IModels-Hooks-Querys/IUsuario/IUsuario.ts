import { IValuesQuery } from '../_IShared';
import { IUsuario } from 'src/app/models/firebase/usuario/usuario';

//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
/*IValuesQuery[Model]:*/
//objetos contenedores de valores auxiliares para construir la consulta
export interface IValuesQueryUsuario extends IValuesQuery {
        
        //Orden para los campos 
        order?:IUsuario<"asc"|"desc">;

        //================================================
        //objetos utilitarios que almacenan los valores para 
        //construir Querys poco complejas
        
        //consultar igualdad en valor string
        VQ_EqualStr?: IUsuario<string>;
        //consultar inicial o inicio de un string
        VQ_IniStr?: IUsuario<string>;
        //consultar igualdad en valor numerico
        VQ_EqualNum?: IUsuario<number>;
        //consultar mayor que en valor numerico
        VQ_GtNum?: IUsuario<number>;
        //consultar mayor o igual que en valor numerico
        VQ_GtEqNum?: IUsuario<number>;     
        //consultar menor que en valor numerico
        VQ_LtNum?: IUsuario<number>;
        //consultar menor o igual que en valor numerico
        VQ_LtEqNum?: IUsuario<number>;    
        //consultar entre valores numericos
        VQ_BtNum?: IUsuario<{Gt:number, Lt:number}>;        
        
        //================================================
        //Objetos que almacenan Valores para construir 
        //Querys mas complejas

}

//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
/*IValuesHooks[Model]:*/
//contiene la tipificacion de los valores de lso hooks que deben ser 
//implementados en cualquier service de cualquier proveedor de BD
export interface IValuesHooksUsuario<TModel_Meta> {

    //================================================
    //Son obligatorios asi no se requieran en la clase 
    //HookService[Model] que los implemente
    v_preGet:{
        //aqui colocar las propiedades para los hooks
    };
    v_preMod:{
        //aqui colocar las propiedades para los hooks
    } 
    v_preDelete:{
        //aqui colocar las propiedades para los hooks
    };

    v_postMod:{
        //aqui colocar las propiedades para los hooks
    };
    v_postDelete:{
        //aqui colocar las propiedades para los hooks
    }; 

    //================================================
    //la metadata del modelo se requiere para las 
    //operaciones del Hook en cualquier implementacion
    //este meta puede ser proveeido por cualquier Backend
    model_Meta:TModel_Meta;

}