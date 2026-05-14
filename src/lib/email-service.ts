
import emailjs from '@emailjs/browser';
import { Order, Insumo, Esencia } from '@/context/AppContext';

const SERVICE_ID = 'service_hnq1rc8';
const TEMPLATE_ID = 'template_ivnuuac';
const TEMPLATE_ID_REGISTER = 'template_ssrro49';
const PUBLIC_KEY = 'XHDIikuZRaUrXiYvd';

export const sendRegistrationNotification = async (username: string, password: string, role: string, addLog?: Function) => {
    try {
        const to_email = 'scenta.aromas@gmail.com';
        const templateParams = {
            username: username,
            password: password,
            role: role,
            date: new Date().toLocaleString('es-AR'),
            to_email: to_email
        };

        const response = await emailjs.send(
            SERVICE_ID,
            TEMPLATE_ID_REGISTER,
            templateParams,
            PUBLIC_KEY
        );

        console.log('Email de registro enviado con éxito!', response.status, response.text);
        if (addLog) addLog('info', `Notificación de registro enviada para usuario ${username}`, { status: response.status });
        return { success: true };
    } catch (error: any) {
        console.error('Error al enviar el mail de registro:', error);
        if (addLog) addLog('error', `Fallo al enviar notificación de registro para ${username}`, { error: error?.text || error });
        return { success: false, error };
    }
};


export const sendOrderNotification = async (order: Order, allInsumos: Insumo[], allEsencias: Esencia[], addLog?: Function) => {
    try {
        const to_email = 'scenta.aromas@gmail.com';
        // 1. Calcular insumos necesarios y faltantes
        const neededItems: Record<string, { name: string; qty: number; unit: string; type: string }> = {};
        
        order.items.forEach(item => {
            item.producto.components.forEach(comp => {
                const key = `${comp.type}-${comp.id}`;
                if (!neededItems[key]) {
                    // Buscar unidad
                    let unit = 'un.';
                    if (comp.type === 'Esencia') {
                        unit = 'g';
                    } else {
                        const ins = allInsumos.find(i => i.id === comp.id);
                        if (ins) unit = ins.unit;
                    }
                    
                    neededItems[key] = { 
                        name: comp.name, 
                        qty: 0, 
                        unit: unit,
                        type: comp.type 
                    };
                }
                neededItems[key].qty += comp.qty * item.quantity;
            });
        });

        const insumosNecesarios: string[] = [];
        const insumosFaltantes: string[] = [];

        Object.values(neededItems).forEach(item => {
            const label = `• ${item.name}: ${item.qty.toFixed(2)}${item.unit}`;
            insumosNecesarios.push(label);

            // Verificar stock asegurando que sean números
            let currentStock = 0;
            if (item.type === 'Esencia') {
                const esc = allEsencias.find(e => e.name === item.name);
                currentStock = Number(esc?.qty || 0);
            } else {
                const ins = allInsumos.find(i => i.name === item.name);
                currentStock = Number(ins?.stock || 0);
            }

            if (currentStock < item.qty) {
                const missing = Number(item.qty - currentStock);
                insumosFaltantes.push(`❌ ${item.name}: Faltan ${missing.toFixed(2)}${item.unit} (Stock actual: ${currentStock.toFixed(2)}${item.unit})`);
            }
        });

        // 2. Formatear la lista de productos del pedido
        const productList = order.items.map(item => {
            const price = item.customPrice || (item.priceType === 'mayorista' ? item.producto.price : item.producto.priceMinorista);
            return `• ${item.quantity}x ${item.producto.name} ($${price.toLocaleString()} c/u) = $${(price * item.quantity).toLocaleString()}`;
        }).join('\n');

        // 3. Preparar parámetros para EmailJS
        const templateParams = {
            order_id: order.id,
            customer_name: order.customerName,
            order_date: new Date(order.date).toLocaleString('es-AR'),
            payment_method: order.paymentMethod.toUpperCase(),
            total_amount: `$${order.total.toLocaleString()}`,
            product_list: productList,
            insumos_necesarios: insumosNecesarios.length > 0 ? insumosNecesarios.join('\n') : 'No se requieren insumos adicionales.',
            insumos_faltantes: insumosFaltantes.length > 0 ? insumosFaltantes.join('\n') : '¡Todo en stock! No faltan insumos.',
            notes: order.cancelationReason || 'Sin notas adicionales',
            to_email: to_email
        };

        const response = await emailjs.send(
            SERVICE_ID,
            TEMPLATE_ID,
            templateParams,
            PUBLIC_KEY
        );

        console.log('Email enviado con éxito!', response.status, response.text);
        if (addLog) addLog('info', `Email de notificación enviado para pedido ${order.id}`, { status: response.status });
        return { success: true };
    } catch (error: any) {
        console.error('Error al enviar el mail:', error);
        if (addLog) addLog('error', `Fallo al enviar EmailJS para pedido ${order.id}`, { error: error?.text || error });
        return { success: false, error };
    }
};
