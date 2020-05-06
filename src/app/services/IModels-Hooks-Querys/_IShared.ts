//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
/*IValuesQuery:*/
//
export interface IValuesQuery {
    //limite de registros  o doc a 
    //leer por consulta    
    limit?: number;

    //numero de la pagina a la 
    //cual se desea acceder
    //IMPORTANTE: NO es la pagina actual
    pageNum?: number;

    //numero de registros a saltarse
    skip?:number;
}

//████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
/*IHooksService:*/
//
export interface IHooksService<TModel> {
    //metodos Hooks pre y post Obligatorios 
    //de implementacion asi no ejecuten 
    //ninguna logica interna
    preGetDoc(Doc:TModel):TModel;
    preModDoc(Doc:TModel, isCreate: boolean):TModel;
    preDeleteDoc(_id:string):string;

    postModDoc(Doc:TModel, isCreate:boolean);
    postDeleteDoc(_id:string);    
}