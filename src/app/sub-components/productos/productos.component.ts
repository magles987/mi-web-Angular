import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl, FormGroup } from "@angular/forms";
import { from, concat, of, interval, merge, combineLatest, timer } from 'rxjs';

import { IControl$, IpathControl$, IRunFunSuscribe, FSModelService } from 'src/app/services/firebase/fs_Model_Service';

import { AuthService, ETipoAuth } from 'src/app/services/firebase/auth/auth.service';
import { AuthNoSocial,  } from 'src/app/models/firebase/auth/authNoSocial';

import { IProducto, Producto } from '../../models/firebase/producto/producto';
import { ProductoService, IQValue_Producto, Iv_PreGet_Producto } from '../../services/firebase/producto/producto.service';

import { emb_SubColeccion, Iemb_SubColeccion } from 'src/app/models/firebase/producto/emb_subColeccion';
import { emb_subColeccionService, IQValue_emb_SubColeccion } from 'src/app/services/firebase/producto/emb_subcoleccion.service';

import { Rol } from 'src/app/models/firebase/rol/rol';
import { RolService } from 'src/app/services/firebase/rol/rol.service';
import { concatAll, mergeAll } from 'rxjs/operators';



@Component({
  selector: 'app-productos',
  templateUrl: './productos.component.html',
  styleUrls: ['./productos.component.css']
})
export class ProductosComponent implements OnInit, OnDestroy {

  //================================================
  //contenedor de documento para trabajo en plantilla
  public Producto:Producto; 

  public Producto$:IControl$<Producto, IProducto<IQValue_Producto>>;
  //public Producto_pathDocCtrl$:IpathDoc$<Producto>;

  public emb_SubColeccion$:IControl$<emb_SubColeccion, Iemb_SubColeccion<IQValue_emb_SubColeccion>>;

  //array de documentos obtenidos de la bd
  //de acuerdo a los filtros aplicados
  public listProductos:Producto[];

  public Productos_Path_Id:Producto | null;

  //================================================
  //Campos del formulario para crear o editar documento
  public formCrearOActualizar:FormGroup; 
  //================================================

  //================================================================================================================================
  constructor(public _AuthService:AuthService,
              public _RolService:RolService,
              public _ProductoService:ProductoService,
              public _emb_SubColeccionService:emb_subColeccionService,
             
             ) {
 
    //================================================
    //preparar la inicializacion de objetos principales
    this.Producto = new Producto();

    this.listProductos = []; 
    //================================================
    //inicializacion de controls
    this.Producto$ = this._ProductoService.createControl$(this.RFS_Productos);
    //this.Producto_pathDocCtrl$ = this._ProductoService.createPathControl$(this.RFS_Productos_pathDoc);
    this.emb_SubColeccion$ = this._emb_SubColeccionService.createControl$(this.RFS_Emb_SubColeccion);

    //================================================
    //inicializacion de primeras consultas (opcional):

    this._ProductoService.ready()
    .then(()=>{

      //this.Producto$ = this._ProductoService.get$(this.Producto$, null, this.getDatosPreGet());
      //this.Producto_pathDocCtrl$ = this._ProductoService.getProducto_pathDoc$(this.Producto_pathDocCtrl$, this.RFS_Productos_pathDoc, null);
    
      //TEST--------------------------------------------------------------------------

      // const _pathBase1 = "Productos/16f1ec3ddfd-81de43de6700c3c7";
      // this.emb_SubColeccion$ = this._emb_SubColeccionService.get$(this.emb_SubColeccion$, null, null, _pathBase1);
      // const obsP = this.Producto$.obsMergeAll;
      // const obsE = this.emb_SubColeccion$.obsMergeAll;
      // const obsT = timer(30000);
      // combineLatest([obsP, obsE, obsT])
      // .subscribe((d)=>{  
      //   console.log("SE HIZO TODO");
      // });
  
      // obsP.subscribe(()=>{
      //   console.log("SE HIZO Producto")
      // });
      // obsE.subscribe(()=>{
      //   console.log("SE HIZO subColeccion")
      // });
  
      //TEST--------------------------------------------------------------------------    
      // let _pathDocs = ["Productos/000001-bb137223430a5d9f", 
      //                 "/Productos/000002-a76299ccf1d7ce9b",
      //                 "/Productos/000003-ab3e840a0dff7f5d",
      //                 "/Productos/000004-9a434806011343ce",
      //                 "/Productos/000005-8d5b017aa032ebc3",
      //                 "/Productos/000006-ba0f544bb2e38778"
      //                 ]
      // let _pathDocs = "Productos/000001-bb137223430a5d9f";
      // let control$ = this._ProductoService.populate(null, this.RFS_poblar, _pathDocs,4);
      // setTimeout(()=>{
      //   this._ProductoService.populate(control$, this.RFS_poblar);
      // }, 10000);
    })
    .catch((err)=>{
      console.log(err);
    });

    //================================================

  }

  //================================================================================================================================
  //Hooks de componente angular:
  //================================================================================================================================
  ngOnInit() {   
    //================================================
    //configurar las opciones del formulario
    let docTpl = new Producto();
    let formControls:any = <IProducto<any>>{
      // _id: new FormControl(docTpl._id),
      nombre : new FormControl(docTpl.nombre),
      categoria : new FormControl(docTpl.categoria),
      precio : new FormControl(docTpl.precio)    
    };

    this.formCrearOActualizar = new FormGroup(formControls); 
    //================================================
  } 

  ngOnDestroy(){
    //================================================
    //desuscribirse de todos los observables que 
    //use este componente 
    FSModelService.unsubscribeControl$([
      this.Producto$,
      this.emb_SubColeccion$
    ]);

    FSModelService.unsubscribePathControl$([
      //..aqui todos los pathControl$
    ]);    
    //================================================
  }

  //================================================================================================================================
  //declarar filtros (se debe usar metodo getters para poder crear
  //objetos de filtrado independientes, tomando una base como referencia)
  private getFiltroProductosTodo():IProducto<IQValue_Producto>{
    let valQuery:IProducto<IQValue_Producto> = {
      _id:{
        _orden:"asc"
      }
    };
    return valQuery;
  } 

  private getFiltroProductosPorNombre():IProducto<IQValue_Producto>{
    let valQuery:IProducto<IQValue_Producto> = {
      nombre:{
        ini:"ha",
        _orden:"asc"
      }
    };
    return valQuery;
  } 

  private getFiltroProductosPorPrecio():IProducto<IQValue_Producto>{
    let valQuery:IProducto<IQValue_Producto> = {
      precio:{
        //val:100 //esto si quiero igualdad
        min:300,
        _orden:"asc"
      }
    };
    return valQuery;
  } 

  private getFiltroProductosPorRuedas():IProducto<IQValue_Producto>{
    let valQuery:IProducto<IQValue_Producto> = {
      map_miscelanea:{
        ruedas:{
          val:2,
          _orden:"asc"
        }
      }
    };
    return valQuery;
  } 

  private getFiltroProductosArrayNormal():IProducto<IQValue_Producto>{
    let valQuery:IProducto<IQValue_Producto> = null;
    return valQuery;
  } 

  //================================================================
  //propiedades metodos de ejecucion next y error para las suscripciones
  //dentro de cada una se ejecuta el codigo una vez leido los docs
  //desde la base de datos (sea poruna nueva solicitud query o por algun cambio 
  //detectado por los observables asignados)

  private RFS_Productos:IRunFunSuscribe<Producto> = {
    next:(docRes:Producto[])=>{
      this.listProductos = docRes;  
    }, 
    error:(err)=>{
      console.log(err);
    }
  };

  private RFS_Productos_pathDoc:IRunFunSuscribe<Producto> = {
    next:(docRes:Producto)=>{
      this.Productos_Path_Id = docRes;
    }, 
    error:(err)=>{
      console.log(err);
    }
  };

  private RFS_Emb_SubColeccion:IRunFunSuscribe<any> = {
    next:(docRes:any[])=>{
      let test = docRes;
      let a ="";
    }, 
    error:(err)=>{
      console.log(err);
    }
  };

  private RFS_poblar:IRunFunSuscribe<any> = {
    next:(docRes:any[])=>{
      let test = docRes;
      let a ="";
    }, 
    error:(err)=>{
      console.log(err);
    }
  };

  //================================================================================================================================
  //paginacion reactiva (se autogestiona de acuerdo al tipo de paginacion):

  public paginarAnterior(){

    this.Producto$ = this._ProductoService.paginate$(this.Producto$, "previousPage");
  }

  public paginarSiguiente(){

    this.Producto$ = this._ProductoService.paginate$(this.Producto$, "nextPage");
  }

  //================================================================
  //metodos que ejecutan nuevas consultas
  //ES MEJOR USAR METODOS INDEPENDIENTES ESTO ES SOLO PRUEBA

  public consultarProducto(opc: "Todo"|"_id"|"Nombre"|"Precio"|"Ruedas"|"ArrayNormal"|"SubCol"|"SubColGrup"){
    Promise.all([
      this._ProductoService.ready(),
      this._emb_SubColeccionService.ready() 
    ])
    .then(()=>{
      switch (opc) {
        case "Todo":
          this.Producto$ = this._ProductoService.get$(this.Producto$, this.getFiltroProductosTodo(), this.getDatosPreGet());
          break;
        case "_id":
          this.Producto$ = this._ProductoService.getId$(this.Producto$, "IDxxxxxxxxxxxxx", this.getDatosPreGet());
          break;        
        case "Nombre":
          this.Producto$ = this._ProductoService.getPorNombre$(this.Producto$, this.getFiltroProductosPorNombre(), this.getDatosPreGet());
          break;  
        case "Precio":
          this.Producto$ = this._ProductoService.getPorPrecio$(this.Producto$, this.getFiltroProductosPorPrecio(), this.getDatosPreGet());
          break;
        case "Ruedas":
          this.Producto$ = this._ProductoService.getPorMiscRuedas$(this.Producto$, this.getFiltroProductosPorRuedas(), this.getDatosPreGet());
          break;  
  
        case "ArrayNormal":
          this.Producto$ = this._ProductoService.getPorArrayNormal$(this.Producto$, null, this.getDatosPreGet());    
          break;
        case "SubCol":
          let path_embBaseNormal = this.listProductos[0]._pathDoc; //opcion basica
          this.emb_SubColeccion$ = this._emb_SubColeccionService.get$(this.emb_SubColeccion$, null, null, path_embBaseNormal );    
          break;           
        case "SubColGrup":
          let path_embBaseGrup = null;
          this.emb_SubColeccion$ = this._emb_SubColeccionService.get$(this.emb_SubColeccion$, null, null, path_embBaseGrup );    
          break;        
      
        default:
          break;
      }
    })
    .catch((err)=>{
      console.log(err)
    });

  }
  //================================================================================================================================
  //================================================================================================================================

  //a modo de prueba
  private getDatosPreGet():Iv_PreGet_Producto{
    return {
      imp : 20
    };
  }

  //================================================================================================================================

  singUpEmail(){
    const credencial = <AuthNoSocial>{
      email: "magles@magles.com",
      pass : "123456"
    }
    
    this._AuthService.signUpNoSocial(credencial)
    .then((result)=>{
      let p = result;
    })
    .catch((err)=>{
      console.log(err);
    });
  }

  login(tipo:ETipoAuth){
    const credencial = <AuthNoSocial>{
      email: "andres@andres.com",
      pass : "987000"
    }
    this._AuthService.login(tipo, credencial)
    .then((result)=>{
      let p = result;
    })
    .catch((err)=>{
      console.log(err);
    });
  }

  logout(){
    this._AuthService.logout()
    .then(()=>{

    })
    .catch((err)=>{
      console.log(err);
    });
  }
  //================================================================================================================================

  public crearOActualizar(docAnterior?:Producto){

    let doc = <Producto>this.formCrearOActualizar.value;

    //================================================
    //determinar si es actualizar o crear (dependiendo 
    //si se recibe docAnterior)
    if (docAnterior) {
      this._ProductoService.update(doc)
      .then((docActualizado)=>{
        console.log("987Actualizado: " + docActualizado);
        this.formCrearOActualizar.reset();
      })
      .catch((error)=>{
        console.log("987 Error al Actualizalo: " + error);
      });           
    } else {
      this._ProductoService.create(doc)
      .then((docCreado)=>{
        console.log("987Creado: " + docCreado);
        this.formCrearOActualizar.reset();
      })
      .catch((error)=>{
        console.log("987 Error al Crearlo: " + error);
      });      
    }    
    //================================================




  }

  crear_set(opc: "Col"|"subCol"){
    switch (opc) {
      case "Col":
        this._ProductoService.create(<Producto>{}) //<Producto>{}solo para ejemplo
        .then(()=>{
          console.log("ya en el componente: ");
        })
        .catch(err=>{
          console.log("tratar el erro en el componente " + err);
        })
        break;

      case "subCol":
        const path_embBase = "Productos/16f1ec3ddfd-81de43de6700c3c7";
        this._emb_SubColeccionService.create(<emb_SubColeccion>{}, path_embBase) //emb_SubColeccion>{}solo para ejemplo
        .then(()=>{
          console.log("ya en el componente: ");
        })
        .catch(err=>{
          console.log("tratar el erro en el componente " + err);
        })
        break;        
    
      default:
        break;
    }

  }

  editar(){
    this._ProductoService.update(<Producto>{})//<Producto>{}solo para ejemplo
    .then(()=>{
      console.log("EDITADO ya en el componente: ");
    })
    .catch(err=>{
      console.log("EDITAR tratar el error en el componente " + err);
    })
  }

  eliminar(){
    this._ProductoService.eliminar("") //""solo para ejemplo
    .then(()=>{
      console.log("borrado ya en el componente: ");
    })
    .catch(err=>{
      console.log("borrado tratar el error en el componente " + err);
    })
  }

}

//================================================================================================================================
