# BambuLab 3D Printer Monitor

A self-hosted web application for monitoring and controlling multiple BambuLab 3D printers.

## Features

- Dashboard view showing all connected printers in a responsive grid
- Real-time printer status monitoring using MQTT
- Live camera feeds from printers using RTSP streams
- Secure authentication system
- Basic printer control (stop prints)
- Easy printer management (add/remove printers)

## Requirements

- Node.js 18+
- Modern web browser
- BambuLab 3D printers on the same network

## Setup Instructions

1. Clone the repository

2. Install dependencies
   ```
   npm install
   ```

3. Create a `.env` file based on `.env.example`
   ```
   cp .env.example .env
   ```

4. Start the development server
   ```
   npm run dev:all
   ```

5. Access the application at `http://localhost:5173`

## Production Deployment

### Docker Setup

1. Build the Docker image
   ```
   docker build -t bambulab-monitor .
   ```

2. Run the container
   ```
   docker run -p 3000:3000 -v /path/to/data:/app/data -e JWT_SECRET=your-secret-key bambulab-monitor
   ```

### Manual Setup

1. Build the application
   ```
   npm run build
   ```

2. Start the server
   ```
   npm run server
   ```

3. Access the application at `http://your-server-ip:3000`

## Accessing Printer Camera Feeds

The application handles RTSP streams from BambuLab printers. The camera feed URL format is:

```
rtsps://bblp:[access_code]@[ip_address]:322/streaming/live/1
```

In a production environment, you would need to properly handle these streams with a dedicated RTSP to WebRTC or HLS conversion service.

## Security Considerations

- The application requires authentication
- All printer connections require access codes
- Set a strong JWT_SECRET in production
- Ensure your printers are on a secure network
- Change default printer passwords

## License

MIT