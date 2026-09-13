const basePath = process.env.NODE_ENV === 'production'
  ? '/saudi-urban-traffic-dashboard'
  : '';

export default function imageLoader({ src }: { src: string }) {
  return `${basePath}${src}`;
}