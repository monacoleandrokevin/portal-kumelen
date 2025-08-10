import { getUser } from "../utils/auth";
import { Link } from "react-router-dom";

export default function Inicio() {
  const { nombre, rol } = getUser();

  const cards = [
    {
      to: "/reservas",
      title: "Reservar espacios",
      desc: "Salas, patios, laboratorios.",
    },
    { to: "/mi-perfil", title: "Mi perfil", desc: "Tus datos y preferencias." },
    { to: "/soporte", title: "Soporte", desc: "Ayuda y reportes." },
  ];

  if (rol === "admin") {
    cards.unshift({
      to: "/admin",
      title: "Panel Admin",
      desc: "Usuarios, permisos y vínculos.",
    });
  }

  return (
    <main className="container py-5">
      <h1 className="h3 mb-4">Hola, {nombre || "bienvenido/a"} 👋</h1>

      <div className="row g-3">
        {cards.map((c) => (
          <div className="col-12 col-md-6 col-lg-4" key={c.to}>
            <Link to={c.to} className="text-decoration-none">
              <div className="card h-100 shadow-sm hover-shadow">
                <div className="card-body">
                  <h5 className="card-title mb-2">{c.title}</h5>
                  <p className="card-text text-muted mb-0">{c.desc}</p>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </main>
  );
}
