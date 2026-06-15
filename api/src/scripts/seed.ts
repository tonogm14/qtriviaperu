import 'dotenv/config';
import { PrismaClient, Difficulty, GameStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // ─── Users (upsert — safe to run multiple times) ──────────────────────────
  const adminPassword = await bcrypt.hash('Admin1234!', 12);
  const userPassword  = await bcrypt.hash('User1234!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@qtriviaperu.com' },
    update: {},
    create: {
      name:        'Admin QTrivia',
      email:       'admin@qtriviaperu.com',
      username:    'admin',
      password:    adminPassword,
      role:        'ADMIN',
      permissions: [], // empty = superadmin (full access)
      balance:     0,
      lives:       99,
      isVip:       true,
    },
  });
  console.log(`✅ Superadmin:     ${admin.email}  /  Admin1234!`);

  // Staff admins with limited permissions
  const staffPassword = await bcrypt.hash('Staff1234!', 12);

  const gamesStaff = await prisma.user.upsert({
    where: { email: 'games@qtriviaperu.com' },
    update: {},
    create: {
      name:        'Staff Juegos',
      email:       'games@qtriviaperu.com',
      username:    'staff_games',
      password:    staffPassword,
      role:        'ADMIN',
      permissions: ['dashboard:read', 'games:read', 'games:write', 'games:notify', 'questions:read'],
    },
  });
  console.log(`✅ Staff (games):  ${gamesStaff.email}  /  Staff1234!`);

  const notifStaff = await prisma.user.upsert({
    where: { email: 'notifs@qtriviaperu.com' },
    update: {},
    create: {
      name:        'Staff Notificaciones',
      email:       'notifs@qtriviaperu.com',
      username:    'staff_notifs',
      password:    staffPassword,
      role:        'ADMIN',
      permissions: ['dashboard:read', 'notifications:broadcast'],
    },
  });
  console.log(`✅ Staff (notifs): ${notifStaff.email}  /  Staff1234!`);

  const usersData = [
    { name: 'Carlos Quispe',  email: 'carlos@example.com', username: 'carlosq',      phone: '999111222', balance: 150.0, lives: 3, isVip: false },
    { name: 'María Torres',   email: 'maria@example.com',  username: 'mariatorres',   phone: '988333444', balance:  75.5, lives: 2, isVip: true  },
    { name: 'José Huanca',    email: 'jose@example.com',   username: 'josehuanca',    phone: '977555666', balance:   0,   lives: 3, isVip: false },
    { name: 'Ana Llanos',     email: 'ana@example.com',    username: 'anallanos',     phone: '966777888', balance: 200.0, lives: 1, isVip: true  },
    { name: 'Pedro Mamani',   email: 'pedro@example.com',  username: 'pedrom',        phone: '955999000', balance:  30.0, lives: 3, isVip: false },
  ];

  const users = await Promise.all(
    usersData.map((u) =>
      prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: { ...u, password: userPassword, role: 'USER' },
      })
    )
  );
  console.log(`✅ Users:  ${users.length} created/found  /  User1234!\n`);

  // ─── Questions (skip if already seeded) ───────────────────────────────────
  const existingQuestions = await prisma.question.count();
  let allQuestions = await prisma.question.findMany({ orderBy: { createdAt: 'asc' } });

  if (existingQuestions === 0) {
    // All questions have exactly 3 options (A/B/C) and correctIndex 0–2
    const questionsData = [
      // Historia
      { text: '¿En qué año se declaró la independencia del Perú?',                  options: ['1821','1824','1810'],                                    correctIndex: 0, category: 'Historia',     difficulty: Difficulty.EASY   },
      { text: '¿Quién proclamó la independencia del Perú?',                          options: ['José de San Martín','Simón Bolívar','Ramón Castilla'],   correctIndex: 0, category: 'Historia',     difficulty: Difficulty.EASY   },
      { text: '¿En qué batalla se consolidó la independencia del Perú en 1824?',    options: ['Batalla de Junín','Batalla de Ayacucho','Batalla de Pisagua'], correctIndex: 1, category: 'Historia', difficulty: Difficulty.MEDIUM },
      { text: '¿Cuál fue el último Sapa Inca antes de la conquista española?',      options: ['Huáscar','Atahualpa','Manco Inca'],                       correctIndex: 1, category: 'Historia',     difficulty: Difficulty.MEDIUM },
      { text: '¿En qué año Francisco Pizarro fundó la ciudad de Lima?',             options: ['1535','1532','1521'],                                    correctIndex: 0, category: 'Historia',     difficulty: Difficulty.HARD   },
      { text: '¿Qué civilización construyó la ciudadela de Machu Picchu?',          options: ['Los Incas','Los Wari','Los Nazca'],                       correctIndex: 0, category: 'Historia',     difficulty: Difficulty.EASY   },
      // Gastronomía
      { text: '¿Cuál es el ingrediente principal del ceviche peruano?',             options: ['Pescado fresco','Mariscos','Pollo'],                      correctIndex: 0, category: 'Gastronomía', difficulty: Difficulty.EASY   },
      { text: '¿Con qué se cocina el ceviche en Perú (la "leche de tigre")?',       options: ['Jugo de limón','Vinagre blanco','Salsa de soya'],         correctIndex: 0, category: 'Gastronomía', difficulty: Difficulty.EASY   },
      { text: '¿Qué papa se usa tradicionalmente en la causa limeña?',              options: ['Papa amarilla','Papa blanca','Papa morada'],              correctIndex: 0, category: 'Gastronomía', difficulty: Difficulty.MEDIUM },
      { text: '¿Cuál es el principal ingrediente del ají de gallina?',              options: ['Ají amarillo','Ají panca','Ají mirasol'],                 correctIndex: 0, category: 'Gastronomía', difficulty: Difficulty.MEDIUM },
      { text: '¿De qué región es originario el plato "juane"?',                     options: ['Selva peruana','Costa peruana','Sierra peruana'],         correctIndex: 0, category: 'Gastronomía', difficulty: Difficulty.MEDIUM },
      { text: '¿Cuál bebida fermentada de maíz es tradicional en los Andes peruanos?', options: ['Chicha de jora','Macerado de frutas','Guarapo'],      correctIndex: 0, category: 'Gastronomía', difficulty: Difficulty.EASY   },
    ];

    await prisma.question.createMany({ data: questionsData });
    allQuestions = await prisma.question.findMany({ orderBy: { createdAt: 'asc' } });
    console.log(`✅ ${allQuestions.length} questions created`);
  } else {
    console.log(`⏭️  Questions already seeded (${existingQuestions}), skipping`);
  }

  // ─── Games (skip if already exist) ────────────────────────────────────────
  const existingGames = await prisma.game.count();

  if (existingGames === 0 && allQuestions.length >= 12) {
    const now = new Date();

    const game1 = await prisma.game.create({
      data: {
        title: 'Trivia Perú Express 🇵🇪',
        scheduledAt: new Date(now.getTime() + 2 * 60 * 60 * 1000),
        status: GameStatus.PENDING,
        prize: 100, entryFee: 0, maxQuestions: 10, timePerQuestion: 10,
        host: 'Admin QTrivia',
      },
    });

    const game2 = await prisma.game.create({
      data: {
        title: 'VIP Championship S/500 💰',
        scheduledAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        status: GameStatus.PENDING,
        prize: 500, entryFee: 20, maxQuestions: 12, timePerQuestion: 15,
        host: 'Admin QTrivia',
      },
    });

    const game3 = await prisma.game.create({
      data: {
        title: 'Historia del Perú 🏛️',
        scheduledAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
        status: GameStatus.FINISHED,
        prize: 50, entryFee: 0, maxQuestions: 8, timePerQuestion: 10,
        host: 'Admin QTrivia', winnerId: users[0].id,
      },
    });

    await prisma.gameQuestion.createMany({ data: allQuestions.slice(0, 10).map((q, i) => ({ gameId: game1.id, questionId: q.id, order: i })) });
    await prisma.gameQuestion.createMany({ data: allQuestions.slice(0, 12).map((q, i) => ({ gameId: game2.id, questionId: q.id, order: i })) });
    await prisma.gameQuestion.createMany({ data: allQuestions.slice(5, 13).map((q, i) => ({ gameId: game3.id, questionId: q.id, order: i })) });

    await prisma.gameEntry.createMany({
      data: [
        { userId: users[0].id, gameId: game3.id, isAlive: true,  score: 8, prize: 50   },
        { userId: users[1].id, gameId: game3.id, isAlive: false, score: 6, prize: null },
        { userId: users[2].id, gameId: game3.id, isAlive: false, score: 4, prize: null },
      ],
    });

    await prisma.user.update({ where: { id: users[0].id }, data: { balance: { increment: 50 } } });
    console.log(`✅ 3 games + entries created`);
  } else {
    console.log(`⏭️  Games already seeded (${existingGames}), skipping`);
  }

  // ─── Notifications ────────────────────────────────────────────────────────
  const existingNotifs = await prisma.notification.count();
  if (existingNotifs === 0) {
    await prisma.notification.createMany({
      data: [
        { userId: users[0].id, type: 'win',      title: '¡Ganaste! 🏆',         body: 'Ganaste S/50.00 en Historia del Perú 🏛️. ¡Felicitaciones!',         isRead: false },
        { userId: users[0].id, type: 'reminder', title: '¡Trivia en 1 hora!',   body: 'Trivia Perú Express 🇵🇪 empieza pronto. ¡Prepárate!',                isRead: false },
        { userId: users[1].id, type: 'life',     title: 'Tus vidas se renovaron', body: 'Ya tienes 3 vidas disponibles para hoy. ¡A jugar!',                isRead: true  },
        { userId: users[2].id, type: 'rank',     title: 'Nueva posición en ranking', body: 'Estás en el puesto #15 del ranking semanal. ¡Sigue jugando!',   isRead: false },
      ],
    });
    console.log(`✅ Sample notifications created`);
  }

  // ─── Withdrawal sample ────────────────────────────────────────────────────
  const existingWithdrawals = await prisma.withdrawal.count();
  if (existingWithdrawals === 0) {
    await prisma.withdrawal.create({
      data: {
        userId: users[0].id, amount: 50, method: 'yape', accountRef: '999111222',
        fee: 0, netAmount: 50, status: 'DONE', code: 'QT-ABCD-1',
      },
    });
    console.log(`✅ Sample withdrawal created`);
  }

  console.log('\n🎉 Seed completed!\n');
  console.log('┌──────────────────────────────────────────────────────────────┐');
  console.log('│  SUPERADMIN  (acceso total al panel web)                     │');
  console.log('│  admin@qtriviaperu.com            / Admin1234!               │');
  console.log('├──────────────────────────────────────────────────────────────┤');
  console.log('│  STAFF ADMINS  (permisos limitados)                          │');
  console.log('│  games@qtriviaperu.com  games+questions  / Staff1234!        │');
  console.log('│  notifs@qtriviaperu.com notifications    / Staff1234!        │');
  console.log('├──────────────────────────────────────────────────────────────┤');
  console.log('│  MOBILE APP (usuarios de prueba)  / User1234!                │');
  console.log('│  carlos@example.com  │  maria@example.com (VIP)              │');
  console.log('│  jose@example.com    │  ana@example.com  (VIP)               │');
  console.log('│  pedro@example.com                                           │');
  console.log('└──────────────────────────────────────────────────────────────┘\n');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
