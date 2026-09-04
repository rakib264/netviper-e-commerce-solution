import winston from 'winston';

// Check if we're in a serverless environment
const isServerless = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';

// Create a serverless-compatible logger
const createLogger = (serviceName: string) => {
  const transports: winston.transport[] = [
    // Always include console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ];

  // Only add file transports in non-serverless environments
  if (!isServerless) {
    try {
      // Try to create file transports
      transports.push(
        new winston.transports.File({ 
          filename: `logs/${serviceName}-error.log`, 
          level: 'error' 
        }),
        new winston.transports.File({ 
          filename: `logs/${serviceName}-combined.log` 
        })
      );
    } catch (error) {
      // If file transport creation fails, just use console
      console.warn(`Failed to create file transports for ${serviceName}, using console only`);
    }
  }

  return winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: { service: serviceName },
    transports
  });
};

export default createLogger;
