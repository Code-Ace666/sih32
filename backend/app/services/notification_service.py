import logging
from sqlalchemy.orm import Session
from app.models.models import Notification, User
from app.config import settings

logger = logging.getLogger("NotificationService")

class MockSMSProvider:
    @staticmethod
    def send_sms(phone: str, message: str) -> bool:
        # Log to system standard output
        print(f"\n[MOCK SMS SENDER] to: {phone}\nMessage: {message}\n" + "-"*40)
        logger.info(f"Mock SMS sent to {phone}: {message}")
        return True

class InAppNotificationProvider:
    @staticmethod
    def create_notification(
        db: Session,
        user_id: str,
        title: str,
        title_hi: str,
        message: str,
        message_hi: str
    ) -> Notification:
        notif = Notification(
            user_id=user_id,
            title=title,
            title_hi=title_hi,
            message=message,
            message_hi=message_hi
        )
        db.add(notif)
        db.commit()
        db.refresh(notif)
        return notif

class NotificationService:
    @staticmethod
    def notify_user(
        db: Session,
        user_id: str,
        title: str,
        title_hi: str,
        message: str,
        message_hi: str
    ):
        # Create In-App Notification
        notif = InAppNotificationProvider.create_notification(
            db, user_id, title, title_hi, message, message_hi
        )

        # Retrieve user phone for SMS
        user = db.query(User).filter(User.id == user_id).first()
        if user and user.phone and settings.MOCK_SMS_ENABLED:
            # We can use English message for SMS or both
            sms_msg = f"{title}: {message}"
            MockSMSProvider.send_sms(user.phone, sms_msg)

        return notif
