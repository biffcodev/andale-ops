
insert into personas(id,alias,email,rol) values
 ('00000000-0000-0000-0000-000000000001','Fer','fer@x','admin'),
 ('00000000-0000-0000-0000-000000000002','Vale','vale@x','equipo'),
 ('00000000-0000-0000-0000-000000000003','Yael','yael@x','externo'),
 ('00000000-0000-0000-0000-000000000004','Ex','ex@x','equipo');
update personas set activo=false where alias='Ex';
insert into clientes(id,nombre) values ('10000000-0000-0000-0000-00000000000a','A'),('10000000-0000-0000-0000-00000000000b','B'),('10000000-0000-0000-0000-00000000000c','C');
insert into proyectos(id,cliente_id,nombre) values ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-00000000000a','p1'),('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-00000000000b','p2');
insert into proyecto_responsables values ('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003');
insert into abonos(id,cliente_id) values ('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-00000000000c'),('30000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-00000000000b');
insert into abono_responsables values ('30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003');
insert into comunicaciones(cliente_id,resumen,responsable_id) values ('10000000-0000-0000-0000-00000000000a','c1','00000000-0000-0000-0000-000000000003'),('10000000-0000-0000-0000-00000000000b','c2','00000000-0000-0000-0000-000000000002');
insert into facturas(cliente_id,monto) values ('10000000-0000-0000-0000-00000000000a',100);
insert into precios_abono(abono_id,desde,monto) values ('30000000-0000-0000-0000-000000000002','2026-10-01',500);


create or replace function t(label text, ok boolean) returns text language sql as $$ select (case when ok then 'PASS ' else 'FAIL ' end)||label $$;
create or replace function tryit(q text) returns boolean language plpgsql as $$ begin execute q; return true; exception when others then return false; end $$;
create or replace function rows_affected(q text) returns int language plpgsql as $$ declare n int; begin execute q; get diagnostics n = row_count; return n; exception when others then return -1; end $$;
grant execute on function t(text,boolean), tryit(text), rows_affected(text) to authenticated;

set role authenticated;
-- externo
set request.jwt.claims = '{"email":"YAEL@x"}';
select t('ext: ve 2 clientes (A por proyecto, C por abono)', (select count(*) from clientes)=2);
select t('ext: ve solo su proyecto', (select array_agg(nombre) from proyectos)='{p1}');
select t('ext: ve solo su abono', (select count(*) from abonos)=1);
select t('ext: ve solo su comunicacion', (select array_agg(resumen) from comunicaciones)='{c1}');
select t('ext: no ve facturas', (select count(*) from facturas)=0);
select t('ext: no ve precios', (select count(*) from precios_abono)=0);
select t('ext: no ve facturas_saldo', (select count(*) from facturas_saldo)=0);
select t('ext: actualiza su proyecto', rows_affected($$update proyectos set estado='En curso' where nombre='p1'$$)=1);
select t('ext: no actualiza proyecto ajeno', rows_affected($$update proyectos set estado='En curso' where nombre='p2'$$)=0);
select t('ext: no mueve proyecto de cliente', not tryit($$update proyectos set cliente_id='10000000-0000-0000-0000-00000000000c' where nombre='p1'$$));
select t('ext: no crea proyectos', not tryit($$insert into proyectos(cliente_id,nombre) values ('10000000-0000-0000-0000-00000000000a','x')$$));
select t('ext: no se asigna proyectos', not tryit($$insert into proyecto_responsables values ('20000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003')$$));
select t('ext: crea comunicacion de su cliente', tryit($$insert into comunicaciones(cliente_id,resumen,responsable_id) values ('10000000-0000-0000-0000-00000000000a','c3','00000000-0000-0000-0000-000000000003')$$));
select t('ext: no crea comunicacion de otro cliente', not tryit($$insert into comunicaciones(cliente_id,resumen,responsable_id) values ('10000000-0000-0000-0000-00000000000b','c4','00000000-0000-0000-0000-000000000003')$$));
select t('ext: no se vuelve admin', rows_affected($$update personas set rol='admin' where alias='Yael'$$)=0);
select t('ext: no edita listas', not tryit($$insert into listas values ('x','{a}')$$));
select t('ext: yo() = Yael externo', (select alias||rol from yo())='Yaelexterno');
-- equipo
set request.jwt.claims = '{"email":"vale@x"}';
select t('equipo: ve 3 clientes', (select count(*) from clientes)=3);
select t('equipo: ve 2 proyectos', (select count(*) from proyectos)=2);
select t('equipo: ve todas las comunicaciones', (select count(*) from comunicaciones)=3);
select t('equipo: no ve facturas', (select count(*) from facturas)=0);
select t('equipo: no crea facturas', not tryit($$insert into facturas(cliente_id,monto) values ('10000000-0000-0000-0000-00000000000a',1)$$));
select t('equipo: no ve movimientos', (select count(*) from movimientos)=0);
select t('equipo: crea cliente', tryit($$insert into clientes(nombre) values ('D')$$));
select t('equipo: asigna responsables', tryit($$insert into proyecto_responsables values ('20000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002')$$));
select t('equipo: no crea personas', not tryit($$insert into personas(alias) values ('Z')$$));
select t('equipo: no cambia roles', rows_affected($$update personas set rol='admin' where alias='Vale'$$)=0);
select t('equipo: edita listas', tryit($$insert into listas values ('x','{a}')$$));
-- inactivo y desconocido
set request.jwt.claims = '{"email":"ex@x"}';
select t('inactivo: no ve nada', (select count(*) from clientes)=0 and (select count(*) from personas)=0);
set request.jwt.claims = '{"email":"nadie@x"}';
select t('desconocido: no ve nada', (select count(*) from clientes)=0 and (select count(*) from proyectos)=0);
reset request.jwt.claims;
select t('sin sesion: no ve nada', (select count(*) from clientes)=0);
-- admin
set request.jwt.claims = '{"email":"fer@x"}';
select t('admin: ve facturas', (select count(*) from facturas)=1);
select t('admin: ve precios', (select count(*) from precios_abono)=1);
select t('admin: crea movimiento', tryit($$insert into movimientos(fecha,cuenta,ingreso) values ('2026-10-01','Ventas en Pesos',100)$$));
select t('admin: saldo factura', (select saldo from facturas_saldo limit 1)=100);
select t('admin: crea persona', tryit($$insert into personas(alias,email,rol) values ('Cintia','cintia@x','externo')$$));
select t('admin: borra cliente con factura falla', not tryit($$delete from clientes where nombre='A'$$));
