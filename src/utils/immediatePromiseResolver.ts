
export const resolveImmediately =  async (param:unknown) => {
    setTimeout(() => {
        if (typeof param === 'function') param()
       console.log(`resolved immediately`) 
    }, 0);
}