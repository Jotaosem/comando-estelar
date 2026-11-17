export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      proyecto: {
        Row: {
          id: string
          codigo_visible: string | null
          nombre: string
          descripcion: string | null
          objetivo: string | null
          area_id: string | null
          area_sponsor_id: string | null
          fase_macro: 'Idea' | 'Discovery' | 'Diseño' | 'Ejecución' | 'Seguimiento' | 'Cerrado' | 'Pausado' | 'Cancelado'
          estado_origen: string | null
          prioridad: string | null
          impacto: string | null
          alcance: string | null
          responsable_id: string | null
          responsable_comunicar_id: string | null
          sponsor_id: string | null
          fecha_inicio: string | null
          fecha_comprometida: string | null
          fecha_objetivo_origen: string | null
          fecha_fin_real: string | null
          proximo_paso: string | null
          decisiones_pendientes: string | null
          riesgos_texto: string | null
          avance_declarado: number | null
          salud_declarada: string | null
          nivel_detalle: 'N1' | 'N2' | 'N3'
          fuente_principal_id: string | null
          url_principal: string | null
          eliminado: boolean
          actualizado_origen_en: string | null
          sincronizado_en: string | null
          creado_en: string
        }
      }
      etapa: {
        Row: {
          id: string
          proyecto_id: string
          fuente_id: string | null
          id_origen: string | null
          origen: 'fase' | 'estado_derivado'
          nombre: string
          orden: number
          estado: 'Pendiente' | 'En curso' | 'Bloqueada' | 'Completada'
          responsable_id: string | null
          responsable_nombre: string | null
          responsable_email: string | null
          inicio_plan: string | null
          fin_plan: string | null
          inicio_real: string | null
          fin_real: string | null
          duracion_dh: number | null
          gate_estado: string | null
          notion_editado_en: string | null
          eliminado: boolean
        }
      }
      bloqueo: {
        Row: {
          id: string
          proyecto_id: string
          etapa_id: string | null
          tarea_id: string | null
          fuente_id: string | null
          id_origen: string | null
          descripcion: string | null
          motivo: 'Aprobación QA' | 'Infraestructura' | 'Seguridad' | 'Dependencia' | 'Decisión pendiente' | 'Proveedor' | 'Otro'
          area_destraba_id: string | null
          responsable_id: string | null
          abierto_en: string
          cerrado_en: string | null
          fecha_apertura: string
          fecha_cierre: string | null
          eliminado: boolean
        }
      }
      tarea: {
        Row: {
          id: string
          proyecto_id: string
          etapa_id: string | null
          fuente_id: string | null
          id_origen: string | null
          codigo: string | null
          nombre: string
          estado: string | null
          prioridad: string | null
          responsable_id: string | null
          responsable_nombre: string | null
          responsable_email: string | null
          inicio_plan: string | null
          fin_plan: string | null
          inicio_real: string | null
          fin_real: string | null
          eliminado: boolean
        }
      }
      proyecto_calculo: {
        Row: {
          proyecto_id: string
          etapa_actual_id: string | null
          avance_pct: number | null
          etapas_completadas: number | null
          etapas_total: number | null
          fecha_reproyectada: string | null
          atraso_dh: number | null
          semaforo: 'verde' | 'amarillo' | 'rojo' | 'gris'
          motivos_semaforo: string[]
          bloqueos_abiertos: number
          ultima_actualizacion: string | null
          sin_actualizar: boolean
          alertas_gobierno: string[]
          desglose: Json | null
          cerrado: boolean
          calculado_en: string
          nivel_detalle: string | null
          regla_aplicada: 'completa' | 'provisoria' | null
          confianza: 'alta' | 'media' | 'baja' | null
        }
      }
      evento_cambio: {
        Row: {
          id: number
          proyecto_id: string
          entidad: string
          entidad_id: string | null
          campo: string | null
          valor_anterior: Json | null
          valor_nuevo: Json | null
          tipo: 'creado' | 'actualizado' | 'eliminado' | 'retroceso'
          detectado_en: string
          fuente_id: string | null
        }
      }
      area: {
        Row: {
          id: string
          codigo: string
          nombre: string
          activa: boolean
        }
      }
      fuente: {
        Row: {
          id: string
          codigo: string
          tipo: 'notion' | 'gestor' | 'otro'
          nombre: string
          nivel_detalle: 'N1' | 'N2' | 'N3'
          prioridad: number
          activa: boolean
        }
      }
      persona: {
        Row: {
          id: string
          nombre: string
          area_id: string | null
        }
      }
    }
    Views: {
      v_proyecto_canonico: {
        Row: {
          id: string
          codigo_visible: string | null
          nombre: string
          descripcion: string | null
          objetivo: string | null
          area_id: string | null
          area_nombre: string | null
          area_codigo: string | null
          fase_macro: 'Idea' | 'Discovery' | 'Diseño' | 'Ejecución' | 'Seguimiento' | 'Cerrado' | 'Pausado' | 'Cancelado'
          estado_origen: string | null
          nivel_detalle: 'N1' | 'N2' | 'N3'
          fuente_principal: string | null
          fuente_tipo: string | null
          url_principal: string | null
          prioridad: string | null
          impacto: string | null
          alcance: string | null
          proximo_paso: string | null
          decisiones_pendientes: string | null
          riesgos_texto: string | null
          fecha_inicio: string | null
          fecha_comprometida: string | null
          responsable_nombre: string | null
          responsable_comunicar_nombre: string | null
          avance_declarado: number | null
          salud_declarada: string | null
          actualizado_origen_en: string | null
          sincronizado_en: string | null
          regla_aplicada: 'completa' | 'provisoria' | null
          confianza: 'alta' | 'media' | 'baja' | null
        }
      }
      v_fuente_estado: {
        Row: {
          codigo: string
          nombre: string
          tipo: string
          nivel_detalle: string
          activa: boolean
          ultima_sync: string | null
          fin: string | null
          estado: string | null
          leidos: number | null
          creados: number | null
          actualizados: number | null
          eliminados: number | null
          errores: Json | null
        }
      }
    }
    Functions: {
      galaxia_resumen: {
        Args: Record<string, never>
        Returns: {
          id: string
          nombre: string
          area_nombre: string | null
          fase_macro: string | null
          semaforo: string | null
          avance_pct: number | null
          fecha_estimada: string | null
          nivel_detalle: string | null
          responsable_nombre: string | null
          puede_ver_detalle: boolean
        }[]
      }
      ultima_sincronizacion: {
        Args: Record<string, never>
        Returns: string | null
      }
      app_email: {
        Args: Record<string, never>
        Returns: string | null
      }
      app_rol: {
        Args: Record<string, never>
        Returns: string | null
      }
      proyecto_visible: {
        Args: {
          p_proyecto: string
        }
        Returns: boolean
      }
    }
  }
}
