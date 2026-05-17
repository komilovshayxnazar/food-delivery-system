FROM node:18-alpine

# Устанавливаем pnpm, так как новый package.json использует его
RUN npm install -g pnpm

WORKDIR /app

# Копируем файлы зависимостей
COPY package.json ./
COPY pnpm-workspace.yam[l] ./

# Устанавливаем зависимости
RUN pnpm install

# Копируем остальной код и собираем
COPY . .
RUN pnpm run build

# Запускаем сервер
CMD ["pnpm", "exec", "vite", "--host", "0.0.0.0", "--port", "80"]
