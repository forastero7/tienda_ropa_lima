import Link from "next/link";
import { store } from "@/lib/config";

// Borradores base. DEBEN ser revisados por un abogado peruano antes de publicar.

const Provider = () => (
  <p>
    El proveedor es <strong>{store.legalName}</strong>, con RUC {store.ruc} y domicilio en {store.legalAddress}. Contacto: {store.supportEmail}.
  </p>
);

export const LEGAL_PAGES: Record<string, { title: string; body: React.ReactNode }> = {
  terminos: {
    title: "Términos y condiciones",
    body: (
      <>
        <h2>Identificación</h2>
        <Provider />
        <h2>Precios y pagos</h2>
        <p>Los precios se expresan en soles (S/) e incluyen IGV. Antes de confirmar la compra se muestra el precio total, incluidos los gastos de envío al distrito indicado.</p>
        <p>El pedido se considera pagado cuando el proveedor de pagos confirma la operación o, en métodos manuales (transferencia, Yape/Plin por QR), cuando verificamos el abono. Una captura de pantalla no constituye confirmación.</p>
        <p>Los productos se reservan durante un tiempo limitado mientras se completa el pago; vencido ese plazo, el pedido se cancela automáticamente y el stock se libera.</p>
        <h2>Disponibilidad</h2>
        <p>El stock se valida al crear el pedido. Si por un error excepcional un producto no estuviera disponible, te contactaremos para ofrecerte un cambio o la devolución íntegra del importe.</p>
        <h2>Comprobantes</h2>
        <p>Emitimos boleta o factura electrónica según los datos ingresados en el checkout.</p>
        <h2>Envíos, cambios y devoluciones</h2>
        <p>Ver <Link href="/legal/envios">Envíos</Link> y <Link href="/legal/cambios-y-devoluciones">Cambios y devoluciones</Link>.</p>
        <h2>Reclamos</h2>
        <p>Puedes registrar un reclamo o queja en nuestro <Link href="/libro-de-reclamaciones">Libro de Reclamaciones</Link> virtual.</p>
      </>
    ),
  },
  privacidad: {
    title: "Política de privacidad",
    body: (
      <>
        <p>Tratamos tus datos personales conforme a la Ley N.º 29733, Ley de Protección de Datos Personales, y su Reglamento aprobado por D.S. N.º 016-2024-JUS.</p>
        <h2>Responsable</h2>
        <Provider />
        <h2>Datos que tratamos y finalidad</h2>
        <ul>
          <li>Nombre, correo, celular y dirección: para procesar, entregar y dar seguimiento a tu pedido (ejecución del contrato).</li>
          <li>DNI/CE o RUC y razón social: para emitir el comprobante electrónico (obligación legal).</li>
          <li>Datos del Libro de Reclamaciones: para atender tu reclamo o queja (obligación legal).</li>
          <li>Correo para novedades y ofertas: solo si marcas la casilla correspondiente (consentimiento revocable).</li>
          <li>Datos de navegación con cookies de medición: solo si las aceptas.</li>
        </ul>
        <p>No almacenamos datos completos de tarjetas: los procesa directamente el proveedor de pagos.</p>
        <h2>Destinatarios</h2>
        <p>Compartimos los datos estrictamente necesarios con: proveedor de pagos, empresa de courier, proveedor de facturación electrónica y proveedor de hosting. [Completar con nombres y, si hay transferencia internacional, el país.]</p>
        <h2>Conservación</h2>
        <p>Conservamos los datos de pedidos durante el plazo exigido por las normas tributarias y de consumo. [Completar plazos.]</p>
        <h2>Tus derechos</h2>
        <p>Puedes ejercer tus derechos de acceso, rectificación, cancelación, oposición y demás reconocidos por la ley escribiendo a {store.supportEmail}. Si no estás conforme con la respuesta, puedes acudir a la Autoridad Nacional de Protección de Datos Personales.</p>
        <p>[Indicar el código de inscripción del banco de datos ante la ANPD, si corresponde.]</p>
      </>
    ),
  },
  cookies: {
    title: "Política de cookies",
    body: (
      <>
        <p>Usamos almacenamiento local y cookies necesarias para que el carrito y el checkout funcionen. No requieren consentimiento.</p>
        <p>Con tu permiso, usamos herramientas de medición (Google Analytics) para entender cómo se usa la tienda. Puedes cambiar tu elección borrando los datos del sitio en tu navegador.</p>
        <p>[Si se activan Meta Pixel o TikTok Pixel, listarlos aquí con su finalidad.]</p>
      </>
    ),
  },
  "cambios-y-devoluciones": {
    title: "Cambios y devoluciones",
    body: (
      <>
        <p>[Borrador a completar con la política comercial definitiva y revisión legal.]</p>
        <h2>Cambio de talla o color</h2>
        <p>Si la prenda no te queda, puedes solicitar el cambio escribiéndonos con tu código de pedido dentro del plazo de nuestra política comercial. La prenda debe estar sin uso, con etiquetas y en su empaque.</p>
        <h2>Productos con fallas</h2>
        <p>Si el producto llegó con defecto o no corresponde a lo comprado, tienes derecho a la reparación, reposición o devolución del importe conforme al Código de Protección y Defensa del Consumidor. Este derecho no está limitado por los plazos de cambio comerciales.</p>
        <h2>Reembolsos</h2>
        <p>Los reembolsos se realizan por el mismo medio de pago, en los plazos que indique el proveedor de pagos o la entidad bancaria.</p>
      </>
    ),
  },
  envios: {
    title: "Envíos",
    body: (
      <>
        <p>Enviamos a Lima, Callao y provincias. El costo depende del distrito de destino y se muestra antes de pagar.</p>
        <p>Los plazos son estimados y dependen del courier y el destino; empiezan a contar cuando el pago está confirmado. Te informaremos el número de guía cuando el pedido sea despachado.</p>
        <p>Es necesario indicar un celular de contacto y una referencia de la dirección.</p>
      </>
    ),
  },
};
