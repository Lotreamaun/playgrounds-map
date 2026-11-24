export type RouteLinkId = 'google' | 'yandex' | 'apple'

export interface RouteLink {
  id: RouteLinkId
  label: string
  href: string
}

export function routeLinks(
  lat: number,
  lon: number,
  ua: string = navigator.userAgent,
): RouteLink[] {
  const links: RouteLink[] = [
    {
      id: 'google',
      label: 'Google Карты',
      href: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`,
    },
    {
      id: 'yandex',
      label: 'Яндекс Карты',
      href: `https://yandex.ru/maps/?rtext=~${lat},${lon}&rtt=auto`,
    },
  ]
  if (/iPhone|iPad|iPod|Macintosh/.test(ua)) {
    links.push({
      id: 'apple',
      label: 'Apple Карты',
      href: `https://maps.apple.com/?daddr=${lat},${lon}`,
    })
  }
  return links
}
