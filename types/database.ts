export interface Familiar {
  dni: string;
  nombre: string;
  parentesco?: string;
}

export type OrganizacionTipo = 'SUTIAGA' | 'MUTUAL' | 'AMBAS';
export type OrganizacionAfiliado = OrganizacionTipo;

export interface Afiliado {
  dni: string;
  nombre_completo: string;
  correo: string;
  contrasena: string;
  organizacion: OrganizacionTipo;
  familiares: Familiar[];
  created_at?: string;
}

export interface Localidad {
  id?: number;
  localidad: string;
  provincia: string;
  created_at?: string;
}

export interface Beneficio {
  id?: number;
  nombre_empresa: string;
  logo: string;
  beneficio: string;
  localidad: string;
  direccion: string;
  organizacion: OrganizacionTipo;
  seccion?: string;
  created_at?: string;
}
