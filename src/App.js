import logo from './logo.svg';
import './App.css';
import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker} from '@mediapipe/tasks-vision';
import {HandLandmarker as MediaPipeHandLandmarker} from '@mediapipe/tasks-vision';

class Quadros{
    constructor({x,y,l,a,color}){
        this.x = x;
        this.y = y;
        this.l = l;
        this.a = a;
        this.color = color;
        this.velocity = 0.5;
        this.queda = false;
        
    }
    desenhar(ctx){
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x,this.y,this.l,this.a)
    }
    cair(){
      this.y += this.velocity
    }
    moverH(b){
      if(this.y < b.y && this.y + this.a > b.y + b.a){
        if(this.x > b.x && this.x < b.x + b.l){
          this.x = b.x + b.l
        }
        else if(this.x + this.l >  b.x && this.x < b.x ){
          this.x = b.x - this.l - 1
        } 
        
      }
    }
    moverV(b){
      if(this.x < b.x && this.x + this.l > b.x + b.l){
        if(this.y < b.y + b.a && this.y > b.y && !this.queda){
          this.y += 2
          this.velocity *= 2
          this.queda = true
        } else if(this.y + this.a > b.y && this.y < b.y){
          this.y = b.y - this.a - 1
        }
      }
    }
    marcar(c){
      if(this.color !== c.color)
        return
      if(this.y + this.a > c.y && this.x > c.x && this.x + this.l < c.x + c.l){
        this.restart()
        this.velocity += 0.2
        return 1
      } else if(this.y + this.a > c.y){
         this.restart()
         return -1
      }

    }
    restart(){
      this.y = Math.floor(Math.random()*-200)
      this.x = Math.floor(Math.random()* 500 + 10)
      this.velocity = 0.5
      this.queda = false
    }
    
}


function App() {
  const Height = 480
  const Width = 640

  const videoRef = useRef(null) 
  const canvasRef = useRef(null)

  const [pontos,setPontos] = useState(0)
  let dimensoes = 70
  let blocos = [
      new Quadros({
          x: 100,
          y: 0,
          a: dimensoes,
          l: dimensoes,
          color: 'red'
        }),
      new Quadros({
          x: 300,
          y: -300,
          a: dimensoes,
          l: dimensoes,
          color: 'red'
        }),
      new Quadros({
        x: 500,
        y: 10,
        a: dimensoes,
        l: dimensoes,
        color: 'blue'
      }),
      new Quadros({
        x: 100,
        y: -400,
        a: dimensoes,
        l: dimensoes,
        color: 'blue'
      }),
      new Quadros({
        x: 200,
        y: 100,
        a: dimensoes,
        l: dimensoes,
        color: 'green'
      }),
      new Quadros({
        x: 400,
        y: -50,
        a: dimensoes,
        l: dimensoes,
        color: 'green'
      }) 
    ]

  let save = [
      new Quadros({
        x: 0,
        y: 460,
        a: 10,
        l: 640/3,
        color: 'green'
      }),
      new Quadros({
        x: 640/3,
        y: 460,
        a: 10,
        l: 640/3,
        color: 'red'
      }),
      new Quadros({
        x: (640/3)*2,
        y: 460,
        a: 10,
        l: 640/3,
        color: 'blue'
      })
    ]

    const [reiniciar, setReiniciar] = useState(false)
    function restart(){
      setPontos(0)
      blocos.forEach(bloco => {bloco.restart()})
    }


  useEffect(()=>{

    let lastVideoTime = -1
    let animationFrameId
    let handLandmarker
    let frameCount = 0

    const canvasCtx = canvasRef.current.getContext('2d')
    
    async function setupMediaPipe(){
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm" 
      );

      handLandmarker = await HandLandmarker.createFromOptions(vision,{
        baseOptions:{
          modelAssetPath: "https://storage.googleapis.com/mediapipe-tasks/hand_landmarker/hand_landmarker.task",
          delegate: 'GPU'
        },
        numHands: 2,
        runningMode: 'VIDEO'
      })
      startCamera()
    }

    async function startCamera(){

    try{
      const constraints = {
        video: { 
            width: { ideal: 640 }, 
            height: { ideal: 480 },
            frameRate: { ideal: 30 } 
          }
        }
    
      const stream = await navigator.mediaDevices.getUserMedia(constraints)

      if(videoRef.current){
        videoRef.current.srcObject = stream
        videoRef.current.addEventListener('loadeddata',predictVideo)
      }
    } catch (err) {
        console.error("Erro ao acessar a câmera:", err);
      }
    }
    let pnts = [{x:0,y:0,z:0},{x:0,y:0,z:0}]
    
    let dedos = []
    let marks = [8,7,12,11,17,5] //Lista de landmarks 
    function predictVideo(){
      
      const video = videoRef.current
      const canvas = canvasRef.current

      if(!video || !canvas || !canvasCtx) return 

      if(canvas.width !== video.videoWdth || canvas.height !== video.videoHeight){
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
    
      frameCount++
      //Faz a análise a cada 2 frames
      if(frameCount % 2 === 0 && video.currentTime !== lastVideoTime){
        lastVideoTime = video.currentTime
        
        const result = handLandmarker.detectForVideo(video, Date.now());
        //Resultado da captura do vídeo

        if(result.landmarks){
          pnts = [{x:0,y:0,z:0},{x:0,y:0,z:0}]
          //Limpar as variáveis para o caso de não ter mãos na tela 

          result.landmarks.forEach((landmarks,i) => {
            marks.forEach((mrk,j) => {
              pnts[j+marks.length*i] = landmarks[mrk]
            })
            //Para cada conjunto de mãos, adicionar no array os landmarks de cada mãos de acordo buscando os marks já definidos 
            
          })
          for (const landmarks of result.landmarks){
            canvasCtx.save()
          }
         
        }   
      }
      canvasCtx.clearRect(0,0,canvas.width,canvas.height)
      
      dedos = []
      //Limpar a função para atualizar os dados 
      pnts.forEach(pnt => {
        dedos.push(new Quadros({
          x: ((1 - pnt.x)*canvas.width - 24/2),
          y: ((pnt.y * canvas.height) - 24/2),
          a: 24,
          l: 24,
          color: 'transparent'
        }))
      })

      if(pontos > -4 && pontos < 49){
          
          dedos.forEach(draw => {
          draw.desenhar(canvasCtx)
          })
        
        blocos.forEach(draw=>{
          dedos.forEach(ponto => {
            draw.moverH(ponto)
            draw.moverV(ponto)
          })
        //Para cada objeto da mão, verificar se está em contato com os objetos Blocos

          draw.cair()
            let incremento = 0
            incremento = (draw.marcar(save[0]) || 
                draw.marcar(save[1]) ||
                draw.marcar(save[2]) || 0)

            setPontos((ponto)=> ponto + incremento)

            

          draw.desenhar(canvasCtx)
        })
        save.forEach(draw => {
          draw.desenhar(canvasCtx)
        })
        
      }
      
      animationFrameId = requestAnimationFrame(predictVideo)
    }

    setupMediaPipe()
    return ()=>{
      cancelAnimationFrame(animationFrameId)
      if(videoRef.current?.srcObject){
        videoRef.current.srcObject.getTracks().forEach(track => track.stop())
      }
    }
  },[])

  

  return (
    <div className="App" style={{ textAlign: 'center', padding: '20px' }}>
      <h1>Cata Blocos</h1>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{ 
            transform:'rotateY(180deg)',
            width: '640px', 
            height: '480px', 
            borderRadius: '10px',
          }} /> 
        <canvas 
          ref={canvasRef}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none' // Garante que cliques passem para o vídeo se necessário
          }}
       /> 
      
        {
        pontos > 49 || pontos < -49 &&
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          display:'flex',
          justifyContent:'center',
          alignItems:'center',
          width: '100%',
          height:'100%',
          background: 'rgba(0, 0, 0, 0.29)',
          color: 'white',
          borderRadius: '10px'
        }}>
           <div 
           style={{
              color: '#fff',
              fontWeight:'400',
              fontSize:"30px",
              padding: '10px'
            }}>
              {pontos > 49  && <p>PARABÉNS</p>}
              {pontos < -49  && <p>VOCÊ PERDEU, tente novamente</p>}
            </div>  
        </div>  } 
       
      </div>
      <div style={{
        width:'100%',
        backgroundColor:"#fff",
        height: '100px',
        margin:'10px',
        borderRadius:'20px',
        justifyContent:'flex-start',
        flexDirection:'row'
      }}>
        <p>Pontos: {pontos}</p>  
        <button style={{
          backgroundColor:"#4c94ff",
          borderRadius:'10px',
          boxShadow:'2px 2px #d1e4ff',
          border:'none',
          padding:'10px',
          color:'#000000',
          
      }}
      onClick={
        ()=>restart()
      }
      >Reiniciar</button>
      </div>
      
    </div>
  );
}

export default App;
