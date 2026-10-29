import { prisma } from "@/lib/db";
import { NotificationChannel, NotificationDeliveryStatus } from "@prisma/client";

export interface NotificationProvider {
  send(params: { title: string; body: string; link?: string }): Promise<boolean>;
  getHealth(): Promise<{ status: string; message?: string }>;
}

class InAppNotificationProvider implements NotificationProvider {
  constructor(private userId: string) {}

  async send(params: { title: string; body: string; link?: string }) {
    await prisma.notification.create({
      data: {
        userId: this.userId,
        channel: NotificationChannel.IN_APP,
        title: params.title,
        body: params.body,
        link: params.link,
        deliveryStatus: NotificationDeliveryStatus.SENT,
      },
    });
    return true;
  }

  async getHealth() {
    return { status: "CONNECTED", message: "In-app notifications" };
  }
}

class TelegramNotificationProvider implements NotificationProvider {
  async send() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) return false;
    // Placeholder: integrasi nyata memerlukan verifikasi API
    return false;
  }

  async getHealth() {
    if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
      return { status: "NOT_CONFIGURED", message: "Telegram belum dikonfigurasi" };
    }
    return { status: "CONFIGURATION_REQUIRED", message: "Token ada — test connection belum diimplementasi" };
  }
}

export async function notifyDbmUsers(params: {
  title: string;
  body: string;
  link?: string;
}) {
  const dbmUsers = await prisma.userRole.findMany({
    where: { role: { code: { in: ["DBM_OPERATOR", "SUPER_ADMIN"] } } },
    include: { user: true },
  });
  for (const ur of dbmUsers) {
    const provider = new InAppNotificationProvider(ur.userId);
    await provider.send(params);
  }
}

export function getTelegramProvider(): NotificationProvider {
  return new TelegramNotificationProvider();
}
