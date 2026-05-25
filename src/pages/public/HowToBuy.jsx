import React, { useState } from 'react';
import { MessageCircle, CreditCard, Ticket, Package, Check, Copy } from 'lucide-react';

// ⚠️ TEMPORAL — Esta sección será removida luego
// Alias de Mercado Pago para recibir la seña
const MP_ALIAS = 'luriel.lemon';

const steps = [
    {
        id: 1,
        icon: MessageCircle,
        color: '#25D366',
        bgColor: 'rgba(37,211,102,0.1)',
        borderColor: 'rgba(37,211,102,0.3)',
        title: 'Pedí tu cotización',
        description: (
            <>
                Escribinos por <strong>WhatsApp</strong> preguntando por el producto que te interesa.
                Te respondemos con el precio actualizado y la disponibilidad de stock.
            </>
        ),
        badge: 'Paso 1',
    },
    {
        id: 2,
        icon: CreditCard,
        color: '#009ee3',
        bgColor: 'rgba(0,158,227,0.1)',
        borderColor: 'rgba(0,158,227,0.3)',
        title: 'Dejá una seña via Mercado Pago',
        description: (
            <>
                Para reservar tu pedido, transferí una <strong>pequeña seña</strong> a nuestro alias de MP
                y envianos el <strong>comprobante por privado</strong>. Eso asegura tu lugar.
            </>
        ),
        badge: 'Paso 2',
    },
    {
        id: 3,
        icon: Ticket,
        color: '#ff9432',
        bgColor: 'rgba(255,148,50,0.1)',
        borderColor: 'rgba(255,148,50,0.3)',
        title: '¿Tenés cupón? Avisanos',
        description: (
            <>
                Si ves un <strong>cupón activo</strong> en la página, mandanos una captura o el código
                por privado al momento de la seña. Lo aplicamos al precio final. Los cupones son
                por tiempo limitado, ¡no te lo pierdas!
            </>
        ),
        badge: 'Paso 3',
        optional: true,
    },
    {
        id: 4,
        icon: Package,
        color: '#a855f7',
        bgColor: 'rgba(168,85,247,0.1)',
        borderColor: 'rgba(168,85,247,0.3)',
        title: 'Coordinamos la entrega',
        description: (
            <>
                Una vez confirmada la seña, coordinamos <strong>fecha, lugar y forma de entrega</strong> por
                privado. Podés pasar a retirarlo o acordar envío según disponibilidad.
            </>
        ),
        badge: 'Paso 4',
    },
];

export function HowToBuy() {
    const [copied, setCopied] = useState(false);

    const handleCopyAlias = async () => {
        try {
            await navigator.clipboard.writeText(MP_ALIAS);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // fallback silencioso
        }
    };

    return (
        <section className="how-to-buy-section py-20 px-4 relative overflow-hidden">
            {/* Fondo decorativo */}
            <div className="htb-bg-glow htb-bg-glow--1" />
            <div className="htb-bg-glow htb-bg-glow--2" />

            <div className="max-w-5xl mx-auto relative z-10">
                {/* Header */}
                <div className="text-center mb-14">
                    <span className="htb-badge">Proceso de compra</span>
                    <h2 className="htb-title">¿Cómo comprar?</h2>
                    <p className="htb-subtitle">
                        Todo se gestiona de forma personalizada. Simple, directo y sin complicaciones.
                    </p>
                </div>

                {/* Alias MP */}
                <div className="htb-alias-card">
                    <div className="htb-alias-card__icon">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-7 h-7">
                            <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" fill="#009ee3" />
                            <path d="M16.5 9.5c0 1.933-1.567 3.5-3.5 3.5H9.5L8 17h2l.5-2H13c2.761 0 5-2.239 5-5s-2.239-5-5-5H8.5L7 9.5h2l.75-3H13c1.933 0 3.5 1.567 3.5 3.5z" fill="white" />
                        </svg>
                    </div>
                    <div className="htb-alias-card__info">
                        <p className="htb-alias-card__label">Alias Mercado Pago para tu seña</p>
                        <p className="htb-alias-card__alias">{MP_ALIAS}</p>
                    </div>
                    <button
                        onClick={handleCopyAlias}
                        className="htb-alias-card__copy-btn"
                        title="Copiar alias"
                    >
                        {copied ? (
                            <>
                                <Check className="w-4 h-4 text-emerald-400" />
                                <span>¡Copiado!</span>
                            </>
                        ) : (
                            <>
                                <Copy className="w-4 h-4" />
                                <span>Copiar</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Steps */}
                <div className="htb-steps">
                    {steps.map((step, idx) => {
                        const Icon = step.icon;
                        return (
                            <div key={step.id} className="htb-step">
                                {/* Connector line */}
                                {idx < steps.length - 1 && (
                                    <div className="htb-step__connector" />
                                )}

                                {/* Number bubble */}
                                <div
                                    className="htb-step__number"
                                    style={{ background: step.color, boxShadow: `0 0 20px ${step.color}55` }}
                                >
                                    {step.id}
                                </div>

                                {/* Card */}
                                <div
                                    className="htb-step__card"
                                    style={{
                                        background: step.bgColor,
                                        borderColor: step.borderColor,
                                    }}
                                >
                                    <div className="htb-step__card-header">
                                        <div
                                            className="htb-step__icon-wrap"
                                            style={{ background: step.bgColor, border: `1.5px solid ${step.borderColor}` }}
                                        >
                                            <Icon style={{ color: step.color }} className="w-5 h-5" />
                                        </div>
                                        <div className="htb-step__badges">
                                            <span className="htb-step__badge" style={{ color: step.color, borderColor: step.borderColor }}>
                                                {step.badge}
                                            </span>
                                            {step.optional && (
                                                <span className="htb-step__optional-badge">Opcional</span>
                                            )}
                                        </div>
                                    </div>

                                    <h3 className="htb-step__title">{step.title}</h3>
                                    <p className="htb-step__desc">{step.description}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* CTA WhatsApp */}
                <div className="htb-cta">
                    <p className="htb-cta__text">¿Listo para empezar? ¡Escribinos ahora!</p>
                    <a
                        href="https://wa.me/1134656584"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="htb-cta__btn"
                    >
                        <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                            <path d="M12 4C7.6 4 4 7.6 4 12C4 13.5 4.4 14.9 5.2 16.1L4 20L8 18.8C9.2 19.5 10.6 19.9 12 19.9C16.4 19.9 20 16.3 20 11.9C20 7.5 16.4 4 12 4ZM16.2 15.3C16 15.8 15.1 16.3 14.6 16.4C14.1 16.5 13.5 16.5 12.9 16.3C12.4 16.1 11.7 15.9 10.9 15.5C8.9 14.5 7.6 12.5 7.5 12.3C7.4 12.1 6.8 11.3 6.8 10.4C6.8 9.5 7.3 9.1 7.5 8.9C7.7 8.7 7.9 8.7 8.1 8.7C8.3 8.7 8.4 8.7 8.6 8.7C8.8 8.7 9 8.6 9.2 9.1C9.4 9.6 9.9 10.5 9.9 10.6C10 10.7 10 10.9 9.9 11C9.8 11.1 9.8 11.2 9.7 11.3C9.6 11.4 9.5 11.6 9.4 11.7C9.3 11.8 9.2 12 9.3 12.2C9.4 12.4 9.9 13.2 10.7 13.9C11.7 14.8 12.5 15.1 12.7 15.2C12.9 15.3 13.1 15.3 13.2 15.1C13.3 15 13.8 14.4 14 14.2C14.2 14 14.3 14 14.5 14.1C14.7 14.2 15.7 14.7 15.9 14.8C16.1 14.9 16.2 15 16.3 15C16.4 15.1 16.4 15.2 16.2 15.3Z" />
                        </svg>
                        Escribir por WhatsApp
                    </a>
                </div>
            </div>
        </section>
    );
}
