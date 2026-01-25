import api from "@/lib/axios";

export const createOrder = async (plan: string) => {
  try {
    const response = await api.post("/api/v1/orders/create", { plan });
    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const verifyPayment = async (
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
) => {
  try {
    const response = await api.post("/api/v1/orders/verify", {
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
    });
    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const getOrderHistory = async () => {
  try {
    const response = await api.get("/api/v1/orders/history");
    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const getOrderByOrderId = async (orderId: string) => {
  try {
    const response = await api.get(`/api/v1/orders/${orderId}`);
    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};
