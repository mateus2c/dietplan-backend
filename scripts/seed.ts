import 'dotenv/config'
import mongoose, { Types } from 'mongoose'
import * as bcrypt from 'bcryptjs'
import { User, UserSchema } from '../src/users/schemas/user.schema'
import { Patient, PatientSchema } from '../src/patients/schemas/patient.schema'
import { MealPlans, MealPlansSchema } from '../src/patients/meal-plans/schemas/meal-plans.schema'
import { Anamnesis, AnamnesisSchema } from '../src/patients/anamnesis/schemas/anamnesis.schema'
import { FOODS } from '../src/foods/foods.data'
import { exit } from 'process'

async function main() {
  const uri = process.env.MONGO_URI
  const dbName = process.env.MONGO_DB_NAME
  if (!uri) {
    throw new Error('MONGO_URI must be defined to run seed')
  }
  if (!dbName) {
    throw new Error('MONGO_DB_NAME must be defined to run seed')
  }
  await mongoose.connect(uri, { dbName })

  const UserModel = mongoose.model<User>('User', UserSchema)
  const PatientModel = mongoose.model<Patient>('Patient', PatientSchema)
  const MealPlansModel = mongoose.model<MealPlans>('MealPlans', MealPlansSchema)
  const AnamnesisModel = mongoose.model<Anamnesis>('Anamnesis', AnamnesisSchema)

  const usersData = [
    { email: 'jane.doe@example.com', password: 'Str0ngP@ssw0rd', role: 'user' as const },
    { email: 'john.roe@example.com', password: 'Str0ngP@ssw0rd', role: 'user' as const },
  ]

  const createdUsers: { id: string; email: string }[] = []
  for (const u of usersData) {
    const existing = await UserModel.findOne({ email: u.email }).lean()
    if (existing) {
      createdUsers.push({ id: existing._id.toString(), email: existing.email })
      continue
    }
    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(u.password, salt)
    const created = await UserModel.create({ email: u.email, passwordHash, role: u.role })
    createdUsers.push({ id: created._id.toString(), email: created.email })
  }

  const patientsData = [
    {
      userEmail: 'jane.doe@example.com',
      fullName: 'Jane Doe',
      gender: 'female' as const,
      birthDate: '1990-05-20',
      phone: '+55 11 91234-5678',
      email: 'jane.patient@example.com',
    },
    {
      userEmail: 'john.roe@example.com',
      fullName: 'John Roe',
      gender: 'male' as const,
      birthDate: '1992-01-01',
      phone: '+55 11 90000-0001',
      email: 'john.patient@example.com',
    },
  ]

  const createdPatients: { id: string; userId: string; email: string }[] = []
  for (const p of patientsData) {
    const owner = createdUsers.find((x) => x.email === p.userEmail)
    if (!owner) continue
    const existingByEmail = await PatientModel.findOne({ email: p.email }).lean()
    const existingByPhone = await PatientModel.findOne({ phone: p.phone }).lean()
    if (existingByEmail || existingByPhone) {
      const doc = await PatientModel.findOne({ $or: [{ email: p.email }, { phone: p.phone }] }).lean()
      if (doc) createdPatients.push({ id: doc._id.toString(), userId: doc.user.toString(), email: doc.email })
      continue
    }
    const created = await PatientModel.create({
      user: new Types.ObjectId(owner.id),
      fullName: p.fullName,
      gender: p.gender,
      birthDate: new Date(p.birthDate),
      phone: p.phone,
      email: p.email,
    })
    createdPatients.push({ id: created._id.toString(), userId: owner.id, email: created.email })
  }

  const pickFood = (id: string) => FOODS.find((f) => f.id === id)?.id || FOODS[0].id
  for (const patient of createdPatients) {
    const pid = new Types.ObjectId(patient.id)
    const plans = [
      {
        title: 'Plano básico',
        meals: [
          {
            name: 'Café da manhã',
            time: '08:00',
            items: [
              { foodId: pickFood('oats'), quantityGrams: 80 },
              { foodId: pickFood('skim_milk'), quantityGrams: 250 },
            ],
          },
          {
            name: 'Almoço',
            time: '12:30',
            items: [
              { foodId: pickFood('brown_rice'), quantityGrams: 150 },
              { foodId: pickFood('chicken_breast'), quantityGrams: 120 },
              { foodId: pickFood('broccoli'), quantityGrams: 100 },
            ],
          },
        ],
      },
    ]
    const mealDoc = await MealPlansModel.findOneAndUpdate(
      { patient: pid },
      { $setOnInsert: { patient: pid }, $set: { plans } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean()
    if (mealDoc) {
      await PatientModel.findByIdAndUpdate(pid, { mealPlans: mealDoc._id }, { new: false }).lean()
    }

    const items = [
      {
        title: 'Avaliação inicial',
        description:
          'Paciente relata dores lombares leves, rotina sedentária e sono irregular. Objetivo: melhora de disposição e hábitos alimentares.',
      },
      {
        title: 'Revisão 30 dias',
        description:
          'Perda de 2kg, melhora do sono, adesão parcial ao plano alimentar. Ajustar ingestão proteica e hidratação.',
      },
    ]
    const anamDoc = await AnamnesisModel.findOneAndUpdate(
      { patient: pid },
      { $setOnInsert: { patient: pid }, $set: { items } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean()
    if (anamDoc) {
      await PatientModel.findByIdAndUpdate(pid, { anamnesis: anamDoc._id }, { new: false }).lean()
    }
  }

  await mongoose.disconnect()
}

main().catch(async (err) => {
  console.error(err)
  try {
    await mongoose.disconnect()
  } catch {}
  exit(1)
})
