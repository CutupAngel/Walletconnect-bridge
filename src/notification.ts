import axios from 'axios'
import { INotification } from './types'

const notifications = new Map<string, INotification[]>()

export const setNotification = (notificationObj: INotification) => {
  const topic = notificationObj.topic
  const notification = notifications.get(topic)
  if (!notification) {
    notifications.set(topic,[notificationObj])
  } else {
    notification.push(notificationObj)
    notifications.set(topic,notification)
  }
}

export const getNotification = (topic: string) :INotification[] => {
  const notification = notifications.get(topic)
  if (notification) {
    return notification
  }
  return []
}

export const pushNotification = (topic: string) => {
  const notifications = getNotification(topic)
  if (notifications && notifications.length) {
    notifications.forEach((notification: INotification) =>
      axios.post(notification.webhook, { topic })
    )
  }
}
