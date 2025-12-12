import 'dotenv/config'
import mongoose, { Types } from 'mongoose'
import * as bcrypt from 'bcryptjs'
import { User, UserSchema } from '../src/users/schemas/user.schema'
import { Patient, PatientSchema } from '../src/patients/schemas/patient.schema'
import { MealPlans, MealPlansSchema } from '../src/patients/meal-plans/schemas/meal-plans.schema'
import { Anamnesis, AnamnesisSchema } from '../src/patients/anamnesis/schemas/anamnesis.schema'
import {
  EnergyCalculation,
  EnergyCalculationSchema,
} from '../src/patients/energy-calculation/schemas/energy-calculation.schema'
import { EnergyCalculationFormula } from '../src/patients/energy-calculation/enums/energy-calculation-formula.enum'
import { PhysicalActivityFactor } from '../src/patients/energy-calculation/enums/physical-activity-factor.enum'
import { InjuryFactor } from '../src/patients/energy-calculation/enums/injury-factor.enum'
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
  const EnergyCalculationModel = mongoose.model<EnergyCalculation>(
    'EnergyCalculation',
    EnergyCalculationSchema,
  )

  const usersData = [
    { email: 'jane.doe@example.com', password: 'Jane@2024!Secure', role: 'user' as const },
    { email: 'john.roe@example.com', password: 'JohnRoe#Pass123', role: 'user' as const },
    { email: 'maria.silva@example.com', password: 'Maria$ilva2024', role: 'user' as const },
    { email: 'carlos.santos@example.com', password: 'C@rlosSant0s!', role: 'user' as const },
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

  const pickFood = (id: string) => FOODS.find((f) => f.id === id)?.id || FOODS[0].id

  // Fixed quantities: 3 patients per user, 3 meal plans per patient, 3 anamnesis items per patient
  const PATIENTS_PER_USER = 3
  const MEAL_PLANS_PER_PATIENT = 3
  const ANAMNESIS_ITEMS_PER_PATIENT = 3

  // Patient data templates
  const patientTemplates = [
    {
      fullName: 'Ana Silva',
      gender: 'female' as const,
      birthDate: '1990-05-20',
      phone: '+55 11 91234-5678',
      emailSuffix: 'ana',
      energyCalculation: {
        height: 165,
        weight: 68,
        energyCalculationFormula: EnergyCalculationFormula.HARRIS_BENEDICT_1984,
        physicalActivityFactor: PhysicalActivityFactor.LEVE,
        injuryFactor: InjuryFactor.NAO_UTILIZAR,
        pregnancyEnergyAdditional: 0,
      },
    },
    {
      fullName: 'João Santos',
      gender: 'male' as const,
      birthDate: '1985-11-15',
      phone: '+55 11 92345-6789',
      emailSuffix: 'joao',
      energyCalculation: {
        height: 182,
        weight: 92,
        energyCalculationFormula: EnergyCalculationFormula.EER_2023,
        physicalActivityFactor: PhysicalActivityFactor.INTENSA,
        injuryFactor: InjuryFactor.FRATURA,
        pregnancyEnergyAdditional: 0,
      },
    },
    {
      fullName: 'Maria Costa',
      gender: 'female' as const,
      birthDate: '1995-08-10',
      phone: '+55 11 93456-7890',
      emailSuffix: 'maria',
      energyCalculation: {
        height: 158,
        weight: 75,
        energyCalculationFormula: EnergyCalculationFormula.MIFFLIN_OBESIDADE_1990,
        physicalActivityFactor: PhysicalActivityFactor.SEDENTARIO,
        injuryFactor: InjuryFactor.NAO_UTILIZAR,
        pregnancyEnergyAdditional: 350,
      },
    },
  ]

  // Meal plan templates
  const mealPlanTemplates = [
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
            { foodId: pickFood('brown_rice_cooked'), quantityGrams: 150 },
            { foodId: pickFood('chicken_breast'), quantityGrams: 120 },
            { foodId: pickFood('broccoli_cooked'), quantityGrams: 100 },
          ],
        },
        {
          name: 'Jantar',
          time: '19:00',
          items: [
            { foodId: pickFood('salmon_grilled'), quantityGrams: 150 },
            { foodId: pickFood('sweet_potato_cooked'), quantityGrams: 200 },
            { foodId: pickFood('broccoli_cooked'), quantityGrams: 150 },
          ],
        },
      ],
    },
    {
      title: 'Plano hiperproteico',
      meals: [
        {
          name: 'Café da manhã',
          time: '07:30',
          items: [
            { foodId: pickFood('boiled_egg'), quantityGrams: 200 },
            { foodId: pickFood('whole_wheat_bread'), quantityGrams: 60 },
            { foodId: pickFood('avocado'), quantityGrams: 100 },
          ],
        },
        {
          name: 'Lanche da manhã',
          time: '10:00',
          items: [{ foodId: pickFood('greek_yogurt_plain'), quantityGrams: 200 }],
        },
        {
          name: 'Almoço',
          time: '13:00',
          items: [
            { foodId: pickFood('chicken_breast'), quantityGrams: 200 },
            { foodId: pickFood('quinoa_cooked'), quantityGrams: 150 },
            { foodId: pickFood('broccoli_cooked'), quantityGrams: 150 },
          ],
        },
        {
          name: 'Lanche da tarde',
          time: '16:00',
          items: [{ foodId: pickFood('greek_yogurt_plain'), quantityGrams: 200 }],
        },
        {
          name: 'Jantar',
          time: '19:30',
          items: [
            { foodId: pickFood('tuna_canned_water'), quantityGrams: 180 },
            { foodId: pickFood('brown_rice_cooked'), quantityGrams: 120 },
            { foodId: pickFood('broccoli_cooked'), quantityGrams: 150 },
          ],
        },
      ],
    },
    {
      title: 'Plano vegetariano',
      meals: [
        {
          name: 'Café da manhã',
          time: '08:00',
          items: [
            { foodId: pickFood('oats'), quantityGrams: 100 },
            { foodId: pickFood('skim_milk'), quantityGrams: 250 },
            { foodId: pickFood('banana'), quantityGrams: 120 },
          ],
        },
        {
          name: 'Almoço',
          time: '12:30',
          items: [
            { foodId: pickFood('lentils_cooked'), quantityGrams: 200 },
            { foodId: pickFood('brown_rice_cooked'), quantityGrams: 150 },
            { foodId: pickFood('broccoli_cooked'), quantityGrams: 150 },
          ],
        },
        {
          name: 'Jantar',
          time: '19:00',
          items: [
            { foodId: pickFood('cottage_cheese'), quantityGrams: 200 },
            { foodId: pickFood('quinoa_cooked'), quantityGrams: 150 },
            { foodId: pickFood('broccoli_cooked'), quantityGrams: 150 },
          ],
        },
      ],
    },
    {
      title: 'Plano low carb',
      meals: [
        {
          name: 'Café da manhã',
          time: '08:00',
          items: [
            { foodId: pickFood('boiled_egg'), quantityGrams: 150 },
            { foodId: pickFood('avocado'), quantityGrams: 100 },
            { foodId: pickFood('cottage_cheese'), quantityGrams: 150 },
          ],
        },
        {
          name: 'Almoço',
          time: '13:00',
          items: [
            { foodId: pickFood('chicken_breast'), quantityGrams: 200 },
            { foodId: pickFood('broccoli_cooked'), quantityGrams: 200 },
            { foodId: pickFood('olive_oil'), quantityGrams: 15 },
          ],
        },
        {
          name: 'Jantar',
          time: '19:00',
          items: [
            { foodId: pickFood('salmon_grilled'), quantityGrams: 180 },
            { foodId: pickFood('broccoli_cooked'), quantityGrams: 200 },
          ],
        },
      ],
    },
    {
      title: 'Plano para ganho de peso',
      meals: [
        {
          name: 'Café da manhã',
          time: '07:00',
          items: [
            { foodId: pickFood('oats'), quantityGrams: 120 },
            { foodId: pickFood('skim_milk'), quantityGrams: 300 },
            { foodId: pickFood('banana'), quantityGrams: 150 },
            { foodId: pickFood('almonds'), quantityGrams: 50 },
          ],
        },
        {
          name: 'Lanche da manhã',
          time: '10:00',
          items: [{ foodId: pickFood('greek_yogurt_plain'), quantityGrams: 200 }],
        },
        {
          name: 'Almoço',
          time: '12:30',
          items: [
            { foodId: pickFood('brown_rice_cooked'), quantityGrams: 200 },
            { foodId: pickFood('chicken_breast'), quantityGrams: 180 },
            { foodId: pickFood('black_beans_cooked'), quantityGrams: 150 },
            { foodId: pickFood('avocado'), quantityGrams: 100 },
          ],
        },
        {
          name: 'Lanche da tarde',
          time: '16:00',
          items: [
            { foodId: pickFood('whole_wheat_bread'), quantityGrams: 80 },
            { foodId: pickFood('cottage_cheese'), quantityGrams: 150 },
          ],
        },
        {
          name: 'Jantar',
          time: '19:30',
          items: [
            { foodId: pickFood('quinoa_cooked'), quantityGrams: 180 },
            { foodId: pickFood('tuna_canned_water'), quantityGrams: 200 },
            { foodId: pickFood('sweet_potato_cooked'), quantityGrams: 250 },
          ],
        },
      ],
    },
  ]

  // Anamnesis item templates
  const anamnesisItemTemplates = [
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
    {
      title: 'Acompanhamento 60 dias',
      description:
        'Ganho de 2.5kg, força aumentada. Manter protocolo e adicionar suplementação de creatina.',
    },
    {
      title: 'Primeira consulta',
      description:
        'Paciente busca ganho de massa muscular. Histórico de treinos regulares, dieta desequilibrada. Objetivo: otimizar nutrição para hipertrofia.',
    },
    {
      title: 'Consulta de rotina',
      description:
        'Paciente relata melhora no sono e digestão após ajustes na dieta. Manter plano atual com pequenos ajustes.',
    },
    {
      title: 'Avaliação nutricional',
      description:
        'Paciente com histórico de diabetes tipo 2 na família. Exames de glicemia em jejum: 95 mg/dL. Focar em controle glicêmico.',
    },
  ]

  let totalPatients = 0
  let totalMealPlans = 0
  let totalAnamnesisItems = 0
  let patientCounter = 1

  // Generate patients for each user
  for (const user of createdUsers) {
    const userId = new Types.ObjectId(user.id)

    // Create 3 patients per user
    for (let p = 0; p < PATIENTS_PER_USER; p++) {
      const template = patientTemplates[p % patientTemplates.length]
      const email = `${template.emailSuffix}.${user.email.split('@')[0]}@example.com`
      const phone = template.phone.replace(/(\d{4})-(\d{4})/, (_, a, b) => {
        const newA = String(parseInt(a) + patientCounter).padStart(4, '0')
        return `${newA}-${b}`
      })

      // Check if patient already exists
      const existingByEmail = await PatientModel.findOne({ email }).lean()
      const existingByPhone = await PatientModel.findOne({ phone }).lean()
      if (existingByEmail || existingByPhone) {
        continue
      }

      // Create patient
      const patient = await PatientModel.create({
        user: userId,
        fullName: template.fullName,
        gender: template.gender,
        birthDate: new Date(template.birthDate),
        phone,
        email,
      })
      const patientId = patient._id
      totalPatients++
      patientCounter++

      // Create 3 meal plans (using different templates)
      const planIndices = [p % mealPlanTemplates.length, (p + 1) % mealPlanTemplates.length, (p + 2) % mealPlanTemplates.length]
      const selectedPlans = planIndices.map((idx, index) => ({
        ...mealPlanTemplates[idx],
        title: `${mealPlanTemplates[idx].title} ${index + 1}`,
      }))

      const mealDoc = await MealPlansModel.findOneAndUpdate(
        { patient: patientId },
        { $setOnInsert: { patient: patientId }, $set: { plans: selectedPlans } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ).lean()

      if (mealDoc) {
        await PatientModel.findByIdAndUpdate(patientId, { mealPlans: mealDoc._id }, { new: false }).lean()
        totalMealPlans += MEAL_PLANS_PER_PATIENT
      }

      // Create 3 anamnesis items (using different templates)
      const anamnesisIndices = [p % anamnesisItemTemplates.length, (p + 1) % anamnesisItemTemplates.length, (p + 2) % anamnesisItemTemplates.length]
      const anamnesisItems = anamnesisIndices.map(idx => anamnesisItemTemplates[idx])

      const anamDoc = await AnamnesisModel.findOneAndUpdate(
        { patient: patientId },
        { $setOnInsert: { patient: patientId }, $set: { items: anamnesisItems } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ).lean()

      if (anamDoc) {
        await PatientModel.findByIdAndUpdate(patientId, { anamnesis: anamDoc._id }, { new: false }).lean()
        totalAnamnesisItems += ANAMNESIS_ITEMS_PER_PATIENT
      }

      // Create 1 energy calculation
      const energyDoc = await EnergyCalculationModel.findOneAndUpdate(
        { patient: patientId },
        {
          $setOnInsert: { patient: patientId },
          $set: {
            height: template.energyCalculation.height,
            weight: template.energyCalculation.weight,
            energyCalculationFormula: template.energyCalculation.energyCalculationFormula,
            physicalActivityFactor: template.energyCalculation.physicalActivityFactor,
            injuryFactor: template.energyCalculation.injuryFactor,
            pregnancyEnergyAdditional: template.energyCalculation.pregnancyEnergyAdditional,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ).lean()

      if (energyDoc) {
        await PatientModel.findByIdAndUpdate(patientId, { energyCalculation: energyDoc._id }, { new: false }).lean()
      }
    }
  }

  console.log('✅ Seed completed successfully!')
  console.log(`   - ${createdUsers.length} users created`)
  console.log(`   - ${totalPatients} patients created`)
  console.log(`   - ${totalMealPlans} meal plans created`)
  console.log(`   - ${totalAnamnesisItems} anamnesis items created`)
  console.log(`   - ${totalPatients} energy calculations created`)

  await mongoose.disconnect()
}

main().catch(async (err) => {
  console.error('❌ Seed failed:', err)
  try {
    await mongoose.disconnect()
  } catch {}
  exit(1)
})
