
import React, { useEffect, useMemo, useState } from "react";

const ORDERS_API = "https://edwin.edabso.com/api/orders/admin";
const PRODUCTS_API = "https://edwin.edabso.com/api/products";

export default function OrdersAdminView() {

  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const token = localStorage.getItem("api_token");

  // =========================================
  // PRODUCTOS INDEXADOS
  // =========================================

  const productsMap = useMemo(() => {

    const map = new Map();

    for (const p of products) {
      map.set(p.id, p);
    }

    return map;

  }, [products]);

  // =========================================
  // CARGAR PRODUCTOS
  // =========================================

  async function loadProducts() {

    try {

      const res = await fetch(PRODUCTS_API, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Error cargando productos");
      }

      const data = await res.json();

      console.log("PRODUCTS:", data);

      setProducts(Array.isArray(data) ? data : []);

    } catch (err) {

      console.error(err);

    }
  }

  // =========================================
  // CARGAR PEDIDOS
  // =========================================

  async function loadOrders() {

    try {

      setLoading(true);

      const res = await fetch(ORDERS_API, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Error cargando pedidos");
      }

      const data = await res.json();

      console.log("ORDERS:", data);

      // 🔥 ocultar cancelados
      const filtered = (Array.isArray(data) ? data : [])
        .filter((o) => o.status !== "cancelled");

      setOrders(filtered);

    } catch (err) {

      console.error(err);
      alert("No se pudieron cargar los pedidos");

    } finally {

      setLoading(false);

    }
  }

  // =========================================
  // CONFIRMAR
  // =========================================

  async function confirmOrder(id: string) {

    try {

      setProcessingId(id);

      const res = await fetch(`${ORDERS_API}/${id}/confirm`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      console.log(data);

      if (!res.ok) {
        throw new Error(
          data.detail ||
          data.error ||
          "Error confirmando pedido"
        );
      }

      setOrders((prev) =>
        prev.map((o) =>
          o.id === id
            ? {
                ...o,
                status: "confirmed",
              }
            : o
        )
      );

    } catch (err: any) {

      console.error(err);
      alert(err.message);

    } finally {

      setProcessingId(null);

    }
  }

  // =========================================
  // CANCELAR
  // =========================================

  async function cancelOrder(id: string) {

    try {

      setProcessingId(id);

      const res = await fetch(`${ORDERS_API}/${id}/cancel`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      console.log(data);

      if (!res.ok) {
        throw new Error(
          data.detail ||
          data.error ||
          "Error cancelando pedido"
        );
      }

      // 🔥 sacar de pantalla
      setOrders((prev) =>
        prev.filter((o) => o.id !== id)
      );

    } catch (err: any) {

      console.error(err);
      alert(err.message);

    } finally {

      setProcessingId(null);

    }
  }

  // =========================================
  // INIT
  // =========================================

  useEffect(() => {

    loadProducts();
    loadOrders();

    const interval = setInterval(() => {
      loadOrders();
    }, 100000);

    return () => clearInterval(interval);

  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b0b0b",
        color: "white",
        padding: 20,
      }}
    >

      {/* HEADER */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 28,
          }}
        >
          Pedidos
        </h1>

        <button
          onClick={loadOrders}
          style={{
            background: "#2563eb",
            border: "none",
            color: "white",
            padding: "10px 16px",
            borderRadius: 10,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Recargar
        </button>
      </div>

      {/* LOADING */}

      {loading && (
        <p>Cargando pedidos...</p>
      )}

      {/* EMPTY */}

      {!loading && orders.length === 0 && (
        <p>No hay pedidos.</p>
      )}

      {/* ORDERS */}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >

        {orders.map((order) => {

          const isPaid =
            order.status === "paid";

          const isConfirmed =
            order.status === "confirmed";

          return (

            <div
              key={order.id}
              style={{
                background: "#161616",
                border: "1px solid #2a2a2a",
                borderRadius: 14,
                padding: 18,
              }}
            >


              {/* TOP */}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 20,
                }}
              >

                <div>

                  <div
                    style={{
                      fontWeight: 700,
                      marginBottom: 8,
                      fontSize: 18,
                    }}
                  >
                    Pedido #{order.id}
                  </div>

                  <div
                    style={{
                      marginBottom: 6,
                    }}
                  >
                    Estado:{" "}
                    <span
                      style={{
                        color:
                          order.status === "paid"
                            ? "#22c55e"
                            : order.status === "confirmed"
                            ? "#3b82f6"
                            : "#facc15",
                        fontWeight: 700,
                      }}
                    >
                      {order.status}
                    </span>
                  </div>

                  {/* ===================================== */}
                  {/* CUSTOMER */}
                  {/* ===================================== */}

                  <div
                    style={{
                      marginTop: 14,
                      background: "#202020",
                      padding: 14,
                      borderRadius: 10,
                    }}
                  >

                    <div
                      style={{
                        fontWeight: 700,
                        marginBottom: 10,
                        fontSize: 15,
                      }}
                    >
                      {
                        order.customer?.title ||
                        "Cliente"
                      }
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        opacity: 0.9,
                      }}
                    >

                      <div>
                        👤 {
                          order.customer?.contact_name ||
                          "Sin nombre"
                        }
                      </div>

                      <div>
                        📞 {
                          order.customer?.phone ||
                          "Sin teléfono"
                        }
                      </div>

                      <div>
                        📍 {
                          order.customer?.address ||
                          "Sin dirección"
                        }
                      </div>

                      <div>
                        ✉️ {
                          order.customer?.email ||
                          "Sin email"
                        }
                      </div>

                    </div>

                  </div>

                  {/* ===================================== */}
                  {/* TOTAL */}
                  {/* ===================================== */}

                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      marginTop: 14,
                    }}
                  >
                    $
                    {Number(order.total || 0)
                      .toLocaleString("es-AR")}
                  </div>

                </div>

                <div
                  style={{
                    opacity: 0.7,
                    fontSize: 13,
                  }}
                >
                  {
                    order.created_at
                      ? new Date(order.created_at)
                          .toLocaleString()
                      : ""
                  }
                </div>

              </div>



              {/* ITEMS */}

              {
                order.items?.length > 0 && (
                  <div
                    style={{
                      marginBottom: 20,
                    }}
                  >

                    <div
                      style={{
                        marginBottom: 12,
                        fontWeight: 700,
                        fontSize: 16,
                      }}
                    >
                      Productos
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                      }}
                    >

                      {
                        order.items.map(
                          (item: any, index: number) => {

                            const product =
                              productsMap.get(item.product_id);

                            return (

                              <div
                                key={index}
                                style={{
                                  background: "#222",
                                  borderRadius: 12,
                                  padding: 14,
                                  display: "flex",
                                  gap: 14,
                                  alignItems: "center",
                                }}
                              >

                                {/* IMAGE */}

                                <div>

                                  {
                                    product?.image_url
                                      ? (
                                        <img
                                          src={product.image_url}
                                          alt=""
                                          style={{
                                            width: 70,
                                            height: 70,
                                            objectFit: "cover",
                                            borderRadius: 10,
                                            background: "#333",
                                          }}
                                        />
                                      )
                                      : (
                                        <div
                                          style={{
                                            width: 70,
                                            height: 70,
                                            borderRadius: 10,
                                            background: "#333",
                                          }}
                                        />
                                      )
                                  }

                                </div>

                                {/* INFO */}

                                <div
                                  style={{
                                    flex: 1,
                                  }}
                                >

                                  <div
                                    style={{
                                      fontWeight: 700,
                                      marginBottom: 6,
                                    }}
                                  >
                                    {
                                      product?.nombre ||
                                      product?.name ||
                                      item.product_id
                                    }
                                  </div>

                                  <div
                                    style={{
                                      opacity: 0.8,
                                      marginBottom: 4,
                                    }}
                                  >
                                    Cantidad: {item.quantity}
                                  </div>

                                  <div
                                    style={{
                                      opacity: 0.8,
                                      marginBottom: 4,
                                    }}
                                  >
                                    Unitario: $
                                    {
                                      Number(item.unit_price || 0)
                                        .toLocaleString("es-AR")
                                    }
                                  </div>

                                  <div
                                    style={{
                                      fontWeight: 700,
                                    }}
                                  >
                                    Subtotal: $
                                    {
                                      Number(item.subtotal || 0)
                                        .toLocaleString("es-AR")
                                    }
                                  </div>

                                </div>

                              </div>

                            );
                          }
                        )
                      }

                    </div>

                  </div>
                )
              }

              {/* ACTIONS */}

              <div
                style={{
                  display: "flex",
                  gap: 12,
                }}
              >

                {/* 🔥 SI YA ESTÁ PAID O CONFIRMED NO MOSTRAR */}

                {
                  !isPaid &&
                  !isConfirmed && (
                    <button
                      disabled={processingId === order.id}
                      onClick={() => confirmOrder(order.id)}
                      style={{
                        background: "#16a34a",
                        border: "none",
                        color: "white",
                        padding: "10px 18px",
                        borderRadius: 10,
                        cursor: "pointer",
                        fontWeight: 700,
                        opacity:
                          processingId === order.id
                            ? 0.5
                            : 1,
                      }}
                    >
                      Confirmar
                    </button>
                  )
                }

                <button
                  disabled={processingId === order.id}
                  onClick={() => cancelOrder(order.id)}
                  style={{
                    background: "#dc2626",
                    border: "none",
                    color: "white",
                    padding: "10px 18px",
                    borderRadius: 10,
                    cursor: "pointer",
                    fontWeight: 700,
                    opacity:
                      processingId === order.id
                        ? 0.5
                        : 1,
                  }}
                >
                  Cancelar
                </button>

              </div>

            </div>

          );
        })}

      </div>

    </div>
  );
}
