import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNotification } from '../contexts/NotificationContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const { showNotification } = useNotification()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      showNotification({
        type: 'error',
        title: 'Error',
        body: 'Se ha producido un error al iniciar sesión. Por favor, verifica tus credenciales e inténtalo de nuevo.',
      })
    }
  }
  return (
    <div className="login-container relative w-[100vw] h-[100vh] bg-zen-grey-50 flex gap-[140px] items-center justify-center p-[40px] overflow-hidden">
        {/* Gradiente inferior izquierdo */}
        <div className="absolute left-0 bottom-0 w-[861px] h-[900px] pointer-events-none" style={{ filter: 'blur(140px)' }}>
          <img src="/login-gradient-left.svg" alt="" className="w-full h-full" />
        </div>

        {/* Gradiente superior derecho */}
        <div className="absolute right-0 top-0 w-[1070px] h-[1118px] pointer-events-none" style={{ filter: 'blur(140px)' }}>
          <img src="/login-gradient-right.svg" alt="" className="w-full h-full" />
        </div>


        {/* LEFT SIDE */}
        <div className="left-side relative bg-white w-[603px] h-[677px] p-[50px] rounded-[16px] z-10">
            <div className="zenova-logo mb-[20px]">
                 <div className="h-[29px] w-[129px]">
                    <svg className="h-full w-full">
                        <use href="/icons.svg#zenova-logo" />
                    </svg>
                </div>
            </div>

            <div className="title">
                <h3 className="font-semibold text-zen-blue-900 text-[32px] leading-[112%]">Consulta y gestiona los suministros de tus obras</h3>
            </div>

            <div className='image-wrapper flex justify-center mt-[10px]'>
                <img className="w-[480px]" src="/public/login-mujer.png" alt="" />
            </div>

            <p className='text-zen-blue-950 text-[12px] absolute bottom-[-48px] pl-[115px]'>Zenova {new Date().getFullYear()} - Todos los derechos reservados</p>
        </div>

        {/* RIGHT SIDE */}
        <div className='right-side w-[503px] p-[50px] rounded-[16px] z-10'>
            <form onSubmit={handleLogin} className="flex flex-col gap-[32px]">
              {/* Título */}
              <div className="flex flex-col gap-[16px]">
                <h2 className="font-semibold text-zen-blue-900 text-[32px] leading-[112%]">
                  Inicia sesión
                </h2>
              </div>

              {/* Inputs */}
              <div className="flex flex-col gap-[24px]">
                {/* Email */}
                <div className="flex flex-col gap-[4px]">
                  <label className="font-normal text-zen-grey-800 text-[16px] leading-[147%]">
                    Email
                  </label>
                  <div className="flex gap-[8px] items-center">
                    <input
                      type="text"
                      placeholder="tuemail@email.com"
                      className="w-full bg-white px-[16px] py-[12px] text-[16px] leading-[147%] text-zen-grey-900 placeholder:text-zen-grey-500 border border-gray-300 focus:ring-2 focus:ring-zen-blue-500 focus:border-transparent focus:outline-none rounded-[4px]"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Contraseña */}
                <div className="flex flex-col gap-[4px]">
                  <label className="font-normal text-zen-grey-800 text-[16px] leading-[147%]">
                    Contraseña
                  </label>
                  <div className="flex gap-[8px] items-center relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="tucontraseña"
                      className="w-full bg-white px-[16px] py-[12px] pr-[48px] text-[16px] leading-[147%] text-zen-grey-900 placeholder:text-zen-grey-500 border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-zen-blue-500 focus:border-transparent focus:outline-none"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-[12px] w-[24px] h-[24px] z-10"
                    >
                      <svg className="w-full h-full text-zen-grey-400">
                        <use href="/icons.svg#eye" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Button */}
              <div className="flex flex-col gap-[16px]">
                <button
                  type="submit"
                  className="w-full bg-zen-blue-500 text-white font-semibold text-[16px] leading-[147%] px-[16px] py-[12px] rounded-[4px] hover:bg-zen-blue-600 transition-colors"
                >
                  Acceder
                </button>
              </div>
            </form>
        </div>
    </div>
  )
}