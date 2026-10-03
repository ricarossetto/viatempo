FROM node:20-slim
WORKDIR /srv/viatempo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/weather-domain/package.json packages/weather-domain/package.json
COPY packages/providers/package.json packages/providers/package.json
COPY packages/routing/package.json packages/routing/package.json
COPY services/meteo-ingestor/package.json services/meteo-ingestor/package.json
RUN npm ci --include=dev
COPY . .
ENV PORT=3001 NODE_ENV=production
EXPOSE 3001
HEALTHCHECK --interval=60s --timeout=5s CMD node -e "fetch('http://localhost:'+(process.env.PORT||3001)+'/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["npm", "run", "start", "--workspace", "apps/api"]
