/**
 * Formats a timestamp to a readable date using the local timezone
 */
export function formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(day)}/${pad(month)}/${year} ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}