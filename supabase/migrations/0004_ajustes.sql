-- Ajustes de la agencia (solo admins). Los datos de pago van acá y no en el código:
-- el bundle JS es público, la base no.
create table if not exists public.ajustes (
  clave text primary key,
  valor jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.ajustes enable row level security;
create policy ajustes_admin on public.ajustes for all to authenticated using (public.es_admin()) with check (public.es_admin());
revoke all on public.ajustes from anon;
create trigger ajustes_updated before update on public.ajustes for each row execute function public.set_updated_at();

insert into public.ajustes (clave, valor) values ('resumen_pdf', $json$
{
  "nota": "Debe ser abonado del 1 al 5 del mes en curso, SIN EXCEPCIÓN.",
  "cierre": "Aguardamos confirmación de recepción y comprobante de pago por este medio, para un mayor orden y control para ambos.",
  "cuentas": [
    { "titulo": "Argentina", "sub": "", "campos": [
      ["Nombre del banco", "Banco Galicia"], ["Número de cuenta", "4031469-2 355-3"], ["CBU", "0070355830004031469237"],
      ["DNI", "30238683"], ["Alias de CBU", "weareandale"], ["Nombre del beneficiario", "Fernando Ambordt"] ] },
    { "titulo": "EEUU", "sub": "solo cuentas Empresa", "campos": [
      ["Nombre del banco", "First Century Bank"], ["Dirección del banco", "1731 N Elm St Commerce, GA 30529 USA"],
      ["Enrutamiento de ABA", "061120084"], ["Número de cuenta", "4018940780751"], ["Tipo de cuenta", "CHECKING"],
      ["Nombre del beneficiario", "Fernando Ambordt"] ] },
    { "titulo": "Europa", "sub": "solo cuentas Empresa", "campos": [
      ["Nombre del banco", "Banking Circle S.A."], ["Dirección del banco", "2, Boulevard de la Foire L-1528 LUXEMBOURG"],
      ["IBAN", "LU444080000097975738"], ["BIC", "BCIRLULL"], ["Nombre del beneficiario", "Fernando Ambordt"] ] }
  ],
  "redes": [
    ["instagram", "https://www.instagram.com/weareandale"], ["facebook", "https://www.facebook.com/weareandale"],
    ["behance", "https://www.behance.net/weareandale"], ["twitter", "http://www.twitter.com/weareandale"] ],
  "contacto": [
    ["+54 9 351 705 3527", "https://wa.me/5493517053527"], ["hello@weareandale.com", "mailto:hello@weareandale.com"],
    ["weareandale.com", "https://weareandale.com/"], ["@weareandale", "https://www.instagram.com/weareandale"] ],
  "pie": "with ❤ from cordoba | © àndale Strictly Confidential"
}
$json$::jsonb) on conflict (clave) do nothing;
