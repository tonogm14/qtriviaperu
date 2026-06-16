import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { JuvShapes } from '../../components/JuvShapes';

interface Props {
  navigation: any;
  route: any;
}

type OrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

interface MerchGroupItem {
  orderId: string;
  name: string;
  emoji: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface MerchGroup {
  id: string;
  orderNumber: number | null;
  cartRef: string | null;
  items: MerchGroupItem[];
  totalAmount: number;
  method: string;
  status: OrderStatus;
  address: string | null;
  phone: string | null;
  recipientName: string | null;
  dni: string | null;
  notes: string | null;
  createdAt: string;
}

function fmtOrderNum(n: number | null): string {
  if (!n) return '—';
  return `B01-${n.toString().padStart(7, '0')}`;
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; emoji: string }> = {
  PENDING:   { label: 'Pendiente',  color: '#FBBF24', emoji: '⏳' },
  CONFIRMED: { label: 'Confirmado', color: '#60A5FA', emoji: '✅' },
  SHIPPED:   { label: 'En camino',  color: '#A855F7', emoji: '📦' },
  DELIVERED: { label: 'Entregado',  color: '#34D399', emoji: '🎉' },
  CANCELLED: { label: 'Cancelado',  color: '#EF4444', emoji: '❌' },
};

function formatDate(d: string) {
  return new Date(d).toLocaleString('es-PE', {
    timeZone: 'America/Lima',
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDateShort(d: string) {
  return new Date(d).toLocaleDateString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function buildReceiptHtml(o: MerchGroup): string {
  const date = formatDate(o.createdAt);
  const shortId = fmtOrderNum(o.orderNumber);
  const status = STATUS_CONFIG[o.status] ?? STATUS_CONFIG.PENDING;

  const itemRows = o.items.map(item => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;">${item.emoji} ${item.name}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:center;">${item.quantity}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right;">S/ ${item.unitPrice.toFixed(2)}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:700;">S/ ${item.total.toFixed(2)}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Helvetica Neue',Arial,sans-serif;background:#fff;color:#1a1a2e;padding:32px;max-width:580px;margin:auto}
  .logo{font-size:28px;font-weight:900;letter-spacing:-1px;color:#7C3AED}
  .logo span{color:#FACC15}
  .subtitle{font-size:11px;color:#888;letter-spacing:2px;text-transform:uppercase;margin-top:2px}
  hr.thick{border:none;border-top:2px solid #7C3AED;margin:18px 0}
  hr.thin{border:none;border-top:1px solid #eee;margin:16px 0}
  .row{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:7px}
  .label{font-size:11px;color:#888}
  .value{font-size:13px;font-weight:700;text-align:right}
  .badge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:800;background:${status.color}22;color:${status.color};border:1px solid ${status.color}55}
  h3{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#555;margin-bottom:10px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{text-align:left;font-size:10px;color:#888;text-transform:uppercase;letter-spacing:1px;padding-bottom:6px;border-bottom:2px solid #eee}
  th:not(:first-child){text-align:right}
  th:nth-child(2){text-align:center}
  .total-row{display:flex;justify-content:space-between;align-items:center;margin-top:12px}
  .total-label{font-size:13px;color:#888;text-transform:uppercase;letter-spacing:1px}
  .total-amount{font-size:28px;font-weight:900;color:#7C3AED}
  .footer{margin-top:28px;text-align:center;font-size:11px;color:#aaa;line-height:18px}
  .receipt-num{font-family:monospace;font-size:12px;color:#888}
</style>
</head>
<body>
<div class="logo">Q<span>TRIVIA</span> PERÚ</div>
<div class="subtitle">Boleta electrónica</div>
<hr class="thick"/>
<div class="row"><span class="label">N° Comprobante</span><span class="receipt-num">ORD-${shortId}</span></div>
<div class="row"><span class="label">Fecha</span><span class="value" style="font-weight:400;font-size:12px;">${date}</span></div>
<div class="row"><span class="label">Método de pago</span><span class="value">${o.method.toUpperCase()}</span></div>
<div class="row"><span class="label">Estado</span><span class="badge">${status.emoji} ${status.label}</span></div>
<hr class="thin"/>
<h3>Productos (${o.items.length})</h3>
<table>
  <thead><tr><th>Producto</th><th style="text-align:center;">Cant.</th><th style="text-align:right;">P. unit.</th><th style="text-align:right;">Subtotal</th></tr></thead>
  <tbody>${itemRows}</tbody>
</table>
${o.recipientName ? `
<hr class="thin"/>
<h3>Datos del destinatario</h3>
<div class="row"><span class="label">Nombre</span><span class="value">${o.recipientName}</span></div>
${o.dni ? `<div class="row"><span class="label">DNI</span><span class="value">${o.dni}</span></div>` : ''}
${o.phone ? `<div class="row"><span class="label">Teléfono</span><span class="value">${o.phone}</span></div>` : ''}
${o.address ? `<div class="row"><span class="label">Dirección</span><span class="value" style="max-width:280px;">${o.address}</span></div>` : ''}
${o.notes ? `<div class="row"><span class="label">Notas</span><span class="value">${o.notes}</span></div>` : ''}
` : ''}
<hr class="thin"/>
<div class="total-row">
  <span class="total-label">Total pagado</span>
  <span class="total-amount">S/ ${o.totalAmount.toFixed(2)}</span>
</div>
<div class="footer">QTrivia Perú · Lima, Perú<br/>${formatDateShort(o.createdAt)}<br/><em>Este documento es un comprobante de su compra.</em></div>
</body></html>`;
}

export const OrderDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const order = route.params?.order as MerchGroup;
  const [downloading, setDownloading] = useState(false);

  const statusCfg = STATUS_CONFIG[order?.status] ?? STATUS_CONFIG.PENDING;

  const handleDownloadReceipt = async () => {
    setDownloading(true);
    try {
      const html = buildReceiptHtml(order);
      const { uri } = await Print.printToFileAsync({ html, width: 580 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Guardar boleta electrónica',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Compartir no disponible', 'Tu dispositivo no soporta compartir archivos.');
      }
    } catch {
      Alert.alert('Error', 'No se pudo generar la boleta. Intenta de nuevo.');
    } finally {
      setDownloading(false);
    }
  };

  if (!order) return null;

  return (
    <LinearGradient
      colors={['#4C1D95', '#3B0764']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <StatusBar style="light" />
      <JuvShapes density={0.4} seed={9} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalle del pedido</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Hero */}
        <View style={styles.heroCard}>
          <Text style={styles.heroEmojis}>{order.items.slice(0, 4).map(i => i.emoji).join(' ')}</Text>
          <Text style={styles.heroId}>{fmtOrderNum(order.orderNumber)}</Text>
          <Text style={styles.heroDate}>{formatDate(order.createdAt)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.color + '22', borderColor: statusCfg.color + '55' }]}>
            <Text style={[styles.statusText, { color: statusCfg.color }]}>
              {statusCfg.emoji} {statusCfg.label}
            </Text>
          </View>
        </View>

        {/* Products */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PRODUCTOS ({order.items.length})</Text>
          {order.items.map((item, idx) => (
            <View key={item.orderId} style={[styles.itemRow, idx < order.items.length - 1 && styles.itemRowBorder]}>
              <Text style={styles.itemEmoji}>{item.emoji}</Text>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemQty}>{item.quantity} unid · S/{item.unitPrice.toFixed(2)} c/u</Text>
              </View>
              <Text style={styles.itemTotal}>S/{item.total.toFixed(2)}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>S/{order.totalAmount.toFixed(2)}</Text>
          </View>
        </View>

        {/* Payment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PAGO</Text>
          <View style={styles.detailGrid}>
            <Row label="Método" value={order.method.toUpperCase()} />
            <Row label="Total" value={`S/${order.totalAmount.toFixed(2)}`} highlight />
          </View>
        </View>

        {/* Shipping */}
        {(order.recipientName || order.address || order.phone) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>DATOS DEL DESTINATARIO</Text>
            <View style={styles.detailGrid}>
              {order.recipientName && <Row label="Nombre" value={order.recipientName} />}
              {order.dni && <Row label="DNI" value={order.dni} />}
              {order.phone && <Row label="Teléfono" value={order.phone} />}
              {order.address && <Row label="Dirección" value={order.address} fullWidth />}
              {order.notes && <Row label="Notas" value={order.notes} fullWidth />}
            </View>
          </View>
        )}

        {/* Download receipt */}
        <TouchableOpacity
          style={styles.receiptBtn}
          activeOpacity={0.8}
          onPress={handleDownloadReceipt}
          disabled={downloading}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.06)']}
            style={styles.receiptBtnGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {downloading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Text style={styles.receiptIcon}>📄</Text>
                <Text style={styles.receiptText}>Descargar boleta electrónica</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </LinearGradient>
  );
};

function Row({ label, value, highlight, fullWidth }: { label: string; value: string; highlight?: boolean; fullWidth?: boolean }) {
  return (
    <View style={[rowS.wrap, fullWidth && rowS.fullWidth]}>
      <Text style={rowS.label}>{label}</Text>
      <Text style={[rowS.value, highlight && rowS.highlight]}>{value}</Text>
    </View>
  );
}

const rowS = StyleSheet.create({
  wrap: { width: '48%', marginBottom: 14 },
  fullWidth: { width: '100%' },
  label: { color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 3 },
  value: { color: 'white', fontSize: 14, fontWeight: '700', lineHeight: 20 },
  highlight: { color: '#FACC15', fontSize: 17, fontWeight: '900' },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: 18, paddingBottom: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  backIcon: { color: 'white', fontSize: 22, fontWeight: '800', lineHeight: 24 },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: '900', letterSpacing: -0.3 },

  scroll: { paddingHorizontal: 18, paddingTop: 8 },

  heroCard: {
    backgroundColor: 'rgba(168,85,247,0.12)', borderRadius: 22, padding: 22, marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.25)', alignItems: 'center', gap: 6,
  },
  heroEmojis: { fontSize: 44, letterSpacing: 4 },
  heroId: { color: 'white', fontSize: 16, fontWeight: '900', letterSpacing: 2, fontFamily: 'monospace' },
  heroDate: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  statusBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, borderWidth: 1, marginTop: 4 },
  statusText: { fontSize: 13, fontWeight: '800' },

  section: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 18, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  sectionTitle: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 14 },

  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  itemRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  itemEmoji: { fontSize: 28, flexShrink: 0 },
  itemInfo: { flex: 1 },
  itemName: { color: 'white', fontSize: 14, fontWeight: '800' },
  itemQty: { color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 2 },
  itemTotal: { color: '#FACC15', fontSize: 15, fontWeight: '900', flexShrink: 0 },

  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)',
  },
  totalLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  totalAmount: { color: '#FACC15', fontSize: 22, fontWeight: '900' },

  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },

  receiptBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  receiptBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 16, paddingHorizontal: 20,
  },
  receiptIcon: { fontSize: 20 },
  receiptText: { color: 'white', fontSize: 15, fontWeight: '800' },
});
